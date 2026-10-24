import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

// Routes that require a logged-in user.
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/learn",
  "/speak",
  "/vocabulary",
  "/grammar",
  "/mistakes",
  "/progress",
  "/profile",
  "/settings",
  "/what-should-i-say",
  "/fix-my-english",
];

// Routes that require an ADMIN role.
const ADMIN_PREFIXES = ["/admin"];

// Auth pages that a logged-in user should be bounced away from.
const AUTH_PAGES = ["/login", "/register"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  const isAdmin = ADMIN_PREFIXES.some((p) => pathname.startsWith(p));

  if ((isProtected || isAdmin) && !session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAdmin && session?.role !== "ADMIN") {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  if (AUTH_PAGES.includes(pathname) && session) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/learn/:path*",
    "/speak/:path*",
    "/vocabulary/:path*",
    "/grammar/:path*",
    "/mistakes/:path*",
    "/progress/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/what-should-i-say/:path*",
    "/fix-my-english/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
