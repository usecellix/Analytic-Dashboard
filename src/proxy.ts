import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session-token";

// Optimistic gate only; every data function re-checks via requireAdmin().
export function proxy(request: NextRequest) {
  const authed = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  const onLogin = request.nextUrl.pathname === "/login";

  if (!authed && !onLogin) {
    const url = new URL("/login", request.url);
    const next = request.nextUrl.pathname + request.nextUrl.search;
    if (next !== "/") url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }
  if (authed && onLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
