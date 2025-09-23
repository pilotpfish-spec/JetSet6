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

const billingUrl = absoluteUrl("/pricing");

type MinimalUser = { id?: string; email?: string | null } | null | undefined;

export async function generateUserStripe(priceId: string): Promise<responseAction> {
  let redirectUrl = "";

  const raw = await getServerSession(authOptions);
  const session = raw as any as
    | (Session & { user?: MinimalUser })
    | { user?: MinimalUser }
    | null;

  const user = session?.user as MinimalUser;

  if (!user?.id || !user?.email) {
    throw new Error("Unauthorized");
  }

  const subscriptionPlan = await getUserSubscriptionPlan(user.id);

  if (subscriptionPlan.isPaid && subscriptionPlan.stripeCustomerId) {
    const portal = await stripe.billingPortal.sessions.create({
      customer: subscriptionPlan.stripeCustomerId,
      return_url: billingUrl,
    });
    redirectUrl = portal.url ?? billingUrl;
  } else {
    const checkout = await stripe.checkout.sessions.create({
      success_url: billingUrl,
      cancel_url: billingUrl,
      payment_method_types: ["card"],
      mode: "subscription",
      billing_address_collection: "auto",
      customer_email: user.email ?? undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { userId: user.id! },
    });
    redirectUrl = checkout.url ?? billingUrl;
  }

  redirect(redirectUrl);
}
