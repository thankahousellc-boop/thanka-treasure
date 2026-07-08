import Stripe from "stripe";

import { serverEnv } from "@/lib/env";

// No pinned apiVersion: stripe-node falls back to the account's default API
// version. The browser loads js.stripe.com for the same default, so Elements
// Checkout (`ui_mode: "elements"`) can resolve the session it init()s. Pinning
// an older version here made `create` succeed but the client `init` 404 with
// "No such checkout.session" (resource_missing on payment_page).
export const stripe = serverEnv.STRIPE_SECRET_KEY
  ? new Stripe(serverEnv.STRIPE_SECRET_KEY)
  : null;
