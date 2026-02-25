import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "admin_session";

function verify(cookieValue: string): boolean {
  const i = cookieValue.lastIndexOf(".");
  if (i === -1) return false;
  try {
    const payloadStr = atob(cookieValue.slice(0, i).replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadStr) as { exp?: number };
    return !!payload.exp && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) return NextResponse.next();
  if (pathname === "/admin/login") return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!cookie || !verify(cookie)) {
    const login = new URL("/admin/login", req.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
