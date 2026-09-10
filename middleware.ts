import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

// Protects every route under the (app) group — dashboard, inbox, trends,
// ask, reports, settings. Logged-out users are bounced to /login.
// (C1, acceptance criterion 3.)
export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isProtected = [
    "/dashboard",
    "/inbox",
    "/trends",
    "/ask",
    "/reports",
    "/settings",
  ].some((path) => req.nextUrl.pathname.startsWith(path));

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/inbox/:path*", "/trends/:path*", "/ask/:path*", "/reports/:path*", "/settings/:path*"],
};
