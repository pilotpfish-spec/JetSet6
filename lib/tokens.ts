// C:\JetSetNew6\lib\tokens.ts
import { randomBytes } from "crypto";
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "change-me");

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

export async function signShortLivedJWT(payload: Record<string, unknown>, minutes = 15) {
  const exp = Math.floor(Date.now() / 1000) + minutes * 60;
  return await new SignJWT({ ...payload, exp })
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret);
}

export async function verifyJWT<T = any>(token: string): Promise<T> {
  const { payload } = await jwtVerify(token, secret);
  return payload as T;
}
