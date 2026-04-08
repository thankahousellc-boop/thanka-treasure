import { NextResponse, type NextRequest } from "next/server";

import { getProxySession } from "@/lib/auth";

function withProxyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value);
  });

  return target;
}

function toLoginRedirect(request: NextRequest) {
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const { session, response } = await getProxySession(request);

  const isAuthenticated = Boolean(session.user);
  const isAdmin = session.user?.role === "admin";

  const isAdminRoute = pathname.startsWith("/admin");
  const isAccountRoute = pathname.startsWith("/account");
  const isAuthRoute = pathname.startsWith("/auth");

  if (isAdminRoute && !isAuthenticated) {
    return withProxyCookies(response, toLoginRedirect(request));
  }

  if (isAdminRoute && isAuthenticated && !isAdmin) {
    return withProxyCookies(
      response,
      NextResponse.redirect(new URL("/", request.url)),
    );
  }

  if (isAccountRoute && !isAuthenticated) {
    return withProxyCookies(response, toLoginRedirect(request));
  }

  if (isAuthRoute && isAuthenticated) {
    return withProxyCookies(
      response,
      NextResponse.redirect(new URL("/", request.url)),
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
