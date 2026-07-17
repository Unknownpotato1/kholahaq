import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast cookie-only gate for /admin/dashboard.
 *
 * Middleware runs in the Edge runtime and cannot reach Prisma or Firebase
 * Admin. We only check that the session cookie is present here — the
 * authoritative session verification happens inside the dashboard page
 * (server component) and inside every /api/admin/* handler via
 * `requireAdmin()`. If the cookie is missing or stale, the page will
 * redirect to /admin/login itself.
 */
const PROTECTED = ["/admin/dashboard"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }
  const token = req.cookies.get("gomen_admin")?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/dashboard/:path*"],
};
