import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { publicEnv } from "@/lib/env";

import type { AuthProvider, AuthUser, Session } from "../types";

function getSupabasePublicEnv() {
  if (
    !publicEnv.NEXT_PUBLIC_SUPABASE_URL ||
    !publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return null;
  }

  return {
    url: publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    key: publicEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
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
    const env = getSupabasePublicEnv();
    if (!env) {
      throw new Error("Supabase public environment variables are missing.");
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
    const { data, error } = await client.auth.getSession();

    if (error) {
      throw error;
    }

    const session = data.session;
    return toSession(
      session?.user ?? null,
      session?.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : null,
    );
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
    const env = getSupabasePublicEnv();
    const response = NextResponse.next();

    if (!env) {
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

    const { data, error } = await client.auth.getSession();

    if (error) {
      return { session: { user: null, expiresAt: null } as Session, response };
    }

    const session = data.session;
    return {
      session: toSession(
        session?.user ?? null,
        session?.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
      ),
      response,
    };
  }
}
