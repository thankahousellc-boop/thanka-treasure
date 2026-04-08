import { auth, type Session } from "@/lib/auth";

async function resolveSession(session?: Session) {
  if (session) {
    return session;
  }

  return auth.getSession();
}

export async function requireAuthenticatedSession(session?: Session) {
  const resolvedSession = await resolveSession(session);

  if (!resolvedSession.user) {
    throw new Error("Unauthorized");
  }

  return resolvedSession;
}

export async function requireAdminSession(session?: Session) {
  const resolvedSession = await requireAuthenticatedSession(session);

  if (resolvedSession.user?.role !== "admin") {
    throw new Error("Forbidden");
  }

  return resolvedSession;
}
