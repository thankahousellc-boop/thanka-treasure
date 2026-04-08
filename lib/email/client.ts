import { Resend } from "resend";

import { serverEnv } from "@/lib/env";

export const resend = serverEnv.RESEND_API_KEY
  ? new Resend(serverEnv.RESEND_API_KEY)
  : null;

export const resendFromEmail =
  serverEnv.RESEND_FROM_EMAIL ??
  "Tibetan Thanka Treasure <onboarding@resend.dev>";
