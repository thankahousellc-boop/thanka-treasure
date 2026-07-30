import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";
import { monitor } from "@/lib/monitoring/logger";

import { AuthConfigError } from "../errors";
import type { AuthProvider, AuthUser, Session } from "../types";

/** Log the misconfiguration once per runtime, not once per request. */
let warnedMissingAuthConfig = false;

function getSupabasePublicEnv() {
  const url = publicEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return {
      env: null,
      missing: [
        ...(url ? [] : ["NEXT_PUBLIC_SUPABASE_URL"]),
        ...(key ? [] : ["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]),
      ],
    };
  }

  return { env: { url, key }, missing: [] };
}

function deriveRole(user: User): AuthUser["role"] {
  const metadataRole = user.user_metadata?.role;
  const appMetadataRole = user.app_metadata?.role;

  if (metadataRole === "admin" || appMetadataRole === "admin") {
    return "admin";
  }

  return "customer";
}

function toSession(user: User | null, expiresAt?: string | null): Session {
  if (!user || !user.email) {
    return {
      user: null,
      expiresAt: null,
    };
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      role: deriveRole(user),
    },
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  };
}

export class SupabaseAuthProvider implements AuthProvider {
  private async createServerAuthClient() {
    const { env, missing } = getSupabasePublicEnv();
    if (!env) {
      throw new AuthConfigError(
        `Supabase auth is not configured — missing ${missing.join(", ")}.`,
        missing,
      );
    }

    const cookieStore = await cookies();

    return createServerClient(env.url, env.key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });
  }

  async signUp(
    email: string,
    password: string,
    metadata?: Record<string, unknown>,
  ): Promise<Session> {
    const client = await this.createServerAuthClient();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: metadata ? { data: metadata } : undefined,
    });

    if (error) {
      throw error;
    }

    return toSession(
      data.user,
      data.session?.expires_at
        ? new Date(data.session.expires_at * 1000).toISOString()
        : null,
    );
  }

  async signInWithPassword(email: string, password: string): Promise<Session> {
    const client = await this.createServerAuthClient();
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return toSession(
      data.user,
      data.session?.expires_at
        ? new Date(data.session.expires_at * 1000).toISOString()
        : null,
    );
  }

  async signInWithOAuth(
    provider: "google" | "apple",
    redirectTo: string,
  ): Promise<{ url: string }> {
    const client = await this.createServerAuthClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });

    if (error) {
      throw error;
    }

    if (!data.url) {
      throw new Error("OAuth URL was not returned by Supabase.");
    }

    return { url: data.url };
  }

  async signOut(): Promise<void> {
    const client = await this.createServerAuthClient();
    const { error } = await client.auth.signOut();

    if (error) {
      throw error;
    }
  }

  async getSession(): Promise<Session> {
    const client = await this.createServerAuthClient();

    // Validate the user against the auth server (not just the cookie).
    const { data: userData, error: userError } = await client.auth.getUser();

    if (userError) {
      // Auth server says the cookie is bad — treat as unauthenticated.
      return { user: null, expiresAt: null };
    }

    if (!userData.user) {
      return { user: null, expiresAt: null };
    }

    // getSession() is only used for the expiry timestamp here — the user
    // identity above is already verified.
    let expiresAt: string | null = null;
    try {
      const { data: sessionData } = await client.auth.getSession();
      expiresAt = sessionData.session?.expires_at
        ? new Date(sessionData.session.expires_at * 1000).toISOString()
        : null;
    } catch {
      expiresAt = null;
    }

    return toSession(userData.user, expiresAt);
  }

  async getUser(): Promise<Session["user"]> {
    const session = await this.getSession();
    return session.user;
  }

  async resetPassword(email: string, redirectTo: string): Promise<void> {
    const client = await this.createServerAuthClient();
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      throw error;
    }
  }

  async updatePassword(newPassword: string): Promise<void> {
    const client = await this.createServerAuthClient();
    const { error } = await client.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }
  }

  async verifyOtp(token: string, type: "email" | "recovery"): Promise<Session> {
    const client = await this.createServerAuthClient();
    const { data, error } = await client.auth.verifyOtp({
      token_hash: token,
      type,
    });

    if (error) {
      throw error;
    }

    return toSession(
      data.user,
      data.session?.expires_at
        ? new Date(data.session.expires_at * 1000).toISOString()
        : null,
    );
  }

  async getSessionFromRequest(request: NextRequest) {
    const { env, missing } = getSupabasePublicEnv();
    const response = NextResponse.next();

    if (!env) {
      // The proxy runs on every request, so this cannot throw — treat the
      // visitor as signed out, but say so once instead of failing silently.
      if (!warnedMissingAuthConfig) {
        warnedMissingAuthConfig = true;
        monitor.error(
          "Supabase auth is not configured — all requests are treated as signed out.",
          new AuthConfigError(`Missing ${missing.join(", ")}.`, missing),
          { missing },
        );
      }

      return { session: { user: null, expiresAt: null } as Session, response };
    }

    const client = createServerClient(env.url, env.key, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    const { data: userData, error: userError } = await client.auth.getUser();

    if (userError || !userData.user) {
      return { session: { user: null, expiresAt: null } as Session, response };
    }

    let expiresAt: string | null = null;
    try {
      const { data: sessionData } = await client.auth.getSession();
      expiresAt = sessionData.session?.expires_at
        ? new Date(sessionData.session.expires_at * 1000).toISOString()
        : null;
    } catch {
      expiresAt = null;
    }

    return {
      session: toSession(userData.user, expiresAt),
      response,
    };
  }
}
