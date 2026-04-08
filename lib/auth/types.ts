export type AuthUser = {
  id: string;
  email: string;
  role: "customer" | "admin";
};

export type Session = {
  user: AuthUser | null;
  expiresAt: Date | null;
};

export interface AuthProvider {
  signUp(
    email: string,
    password: string,
    metadata?: Record<string, unknown>,
  ): Promise<Session>;
  signInWithPassword(email: string, password: string): Promise<Session>;
  signInWithOAuth(
    provider: "google" | "apple",
    redirectTo: string,
  ): Promise<{ url: string }>;
  signOut(): Promise<void>;
  getSession(): Promise<Session>;
  getUser(): Promise<Session["user"]>;
  resetPassword(email: string, redirectTo: string): Promise<void>;
  updatePassword(newPassword: string): Promise<void>;
  verifyOtp(token: string, type: "email" | "recovery"): Promise<Session>;
}
