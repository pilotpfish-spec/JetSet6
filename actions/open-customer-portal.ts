"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getUserSubscriptionPlan } from "@/lib/subscription";
import { absoluteUrl } from "@/lib/utils";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

export type responseAction = {
  status: "success" | "error";
  stripeUrl?: string;
};

const returnUrl = absoluteUrl("/pricing");

type MinimalUser = { id?: string; email?: string | null } | null | undefined;

export async function openCustomerPortal(): Promise<responseAction> {
  const raw = await getServerSession(authOptions);
  const session = raw as any as
    | (Session & { user?: MinimalUser })
    | { user?: MinimalUser }
    | null;

  const user = session?.user as MinimalUser;

  if (!user?.id || !user?.email) {
    throw new Error("Unauthorized");
  }

  const plan = await getUserSubscriptionPlan(user.id);

  if (!plan?.stripeCustomerId) {
    redirect(returnUrl);
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: plan.stripeCustomerId as string,
    return_url: returnUrl,
  });

  redirect(portal.url ?? returnUrl);
}
