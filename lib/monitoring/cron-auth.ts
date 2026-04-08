import { serverEnv } from "@/lib/env";

export function isCronAuthorized(request: Request) {
  const secret = serverEnv.CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}
