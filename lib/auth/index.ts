import type { NextRequest } from "next/server";

import { SupabaseAuthProvider } from "./providers/supabase";
import type { AuthProvider } from "./types";

const provider = new SupabaseAuthProvider();

export const auth: AuthProvider = provider;

export async function getProxySession(request: NextRequest) {
  return provider.getSessionFromRequest(request);
}

export type { AuthProvider, Session, AuthUser } from "./types";
