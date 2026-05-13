import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, isSignedAuthCookie } from "@/lib/auth-cookie";

const PUBLIC_PATHS = ["/signin"];
const PUBLIC_AUTH_API_PATHS = ["/api/auth/signin", "/api/auth/signout", "/api/auth/password-reset"];

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  return response;
}

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_AUTH_API_PATHS.includes(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/logo-png.png"
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthenticated = await isSignedAuthCookie(req.cookies.get(AUTH_COOKIE_NAME)?.value);

  if (isAuthenticated && PUBLIC_PATHS.includes(pathname)) {
    return withSecurityHeaders(NextResponse.redirect(new URL("/", req.url)));
  }

  if (isPublicPath(pathname)) {
    return withSecurityHeaders(NextResponse.next());
  }

  if (!isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return withSecurityHeaders(NextResponse.json({ error: "Authentication required." }, { status: 401 }));
    }

    const url = new URL("/signin", req.url);
    url.searchParams.set("next", pathname);

    return withSecurityHeaders(NextResponse.redirect(url));
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ["/((?!.*\\..*).*)", "/api/:path*"],
};
