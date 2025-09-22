// C:\JetSetNew6\middleware.ts
export { auth as middleware } from "next-auth/middleware";

// Add which routes should be protected
export const config = {
  matcher: [
    "/account/:path*", // protect account pages
    "/admin/:path*",   // protect admin pages
    "/booking/:path*", // protect booking flow
  ],
};
