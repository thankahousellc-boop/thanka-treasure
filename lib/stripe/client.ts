import Stripe from "stripe";

import { serverEnv } from "@/lib/env";

export const stripe = serverEnv.STRIPE_SECRET_KEY
  ? new Stripe(serverEnv.STRIPE_SECRET_KEY, {
      apiVersion: "2026-03-25.dahlia",
    })
  : null;
