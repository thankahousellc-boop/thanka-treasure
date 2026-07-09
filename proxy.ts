import { NextResponse, type NextRequest } from "next/server";

import { getProxySession } from "@/lib/auth";
import { BASE_CURRENCY } from "@/lib/currency/config";
import {
  COUNTRY_TO_CURRENCY,
  CURRENCY_COOKIE_NAME,
} from "@/lib/currency/constants";

function withProxyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value);
  });

  return target;
}

// Seed a first-time visitor's display currency from geo IP. Pages render
// statically, so this can no longer happen at request time in a server
// component — the edge sets the cookie once and the client <Price> layer reads
// it. Skipped entirely when the visitor already has a currency preference.
function seedCurrencyCookie(request: NextRequest, response: NextResponse) {
  if (request.cookies.get(CURRENCY_COOKIE_NAME)) {
    return;
  }

  const geoCountry =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry");
  const currency =
    COUNTRY_TO_CURRENCY[geoCountry?.trim().toUpperCase() ?? ""] ?? BASE_CURRENCY;

  response.cookies.set(CURRENCY_COOKIE_NAME, currency, {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  });
}

function toLoginRedirect(request: NextRequest) {
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const { session, response } = await getProxySession(request);

  seedCurrencyCookie(request, response);

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
