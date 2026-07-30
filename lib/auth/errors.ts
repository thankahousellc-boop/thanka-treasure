/**
 * Auth is misconfigured (missing/invalid provider credentials) — not a user
 * mistake. Server Actions use this to tell "your password is wrong" apart from
 * "this deployment has no Supabase keys", which otherwise look identical to the
 * visitor and cost hours to diagnose.
 */
export class AuthConfigError extends Error {
  readonly missing: readonly string[];

  constructor(message: string, missing: readonly string[] = []) {
    super(message);
    this.name = "AuthConfigError";
    this.missing = missing;
  }
}

export const isAuthConfigError = (error: unknown): error is AuthConfigError =>
  error instanceof AuthConfigError;
