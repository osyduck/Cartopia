import { NextResponse, type NextRequest } from "next/server";
import { verifySession, SESSION_COOKIE } from "@/lib/auth/jwt";

// Next 16 "proxy" convention (formerly middleware). Gates every panel route
// behind the admin session.
export async function proxy(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);
  const path = req.nextUrl.pathname;
  const isLogin = path === "/login";
  const isLanding = path === "/";

  // Authed users hitting the login page or the public landing go straight to the app.
  if (session && (isLogin || isLanding)) {
    return NextResponse.redirect(new URL("/databases", req.url));
  }
  // Unauthed users can see the landing page and login; everything else redirects to login.
  if (!session && !isLogin && !isLanding) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return NextResponse.next();
}

export const config = {
  // Protect everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
