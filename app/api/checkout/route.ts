import { NextResponse } from "next/server";

import { convertUsdToCurrency, getExchangeRates } from "@/lib/currency/context";
import { publicEnv, serverEnv } from "@/lib/env";
import { monitor } from "@/lib/monitoring/logger";
import { checkoutSessionRepository } from "@/lib/repositories/checkout-session-repository";
import { discountRepository } from "@/lib/repositories/discount-repository";
import { frameRepository } from "@/lib/repositories/frame-repository";
import { productRepository } from "@/lib/repositories/product-repository";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resolveUrl } from "@/lib/storage/resolve-url";
import { stripe } from "@/lib/stripe/client";
import { toStripeLineItems } from "@/lib/stripe/helpers";
import { checkoutSchema } from "@/lib/utils/validators";

// Stripe requires a session to live at least 30 minutes, so that is what the
// Stripe session gets. Our inventory hold is separate and much shorter — see
// RESERVATION_TTL_MS — because it expires on our clock and therefore does not
// depend on the `checkout.session.expired` webhook arriving.
const SESSION_TTL_MS = 30 * 60 * 1000;

type StripeDeliveryUnit = "business_day" | "day" | "hour" | "month" | "week";

type StripeShippingOption = {
  shipping_rate_data: {
    display_name: string;
    type: "fixed_amount";
    fixed_amount: { amount: number; currency: string };
    delivery_estimate?: {
      minimum?: { unit: StripeDeliveryUnit; value: number };
      maximum?: { unit: StripeDeliveryUnit; value: number };
    };
  };
};

type ResolvedCheckoutItem = {
  productId: string;
  variantId: string;
  productTitle: string;
  variantTitle: string | null;
  sku: string | null;
  unitAmount: number;
  quantity: number;
  image?: string;
  frame?: {
    id: string;
    name: string;
    imageUrl?: string | null;
    priceDelta: number;
  } | null;
};

class CheckoutResolutionError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CheckoutResolutionError";
    this.status = status;
  }
}

const ALLOWED_SHIPPING_COUNTRIES = [
  "US",
  "CA",
  "GB",
  "IE",
  "FR",
  "DE",
  "ES",
  "IT",
  "NL",
  "BE",
  "AT",
  "AU",
  "NZ",
  "JP",
  "SG",
  "HK",
  "IN",
] as const;

const ALLOWED_SHIPPING_COUNTRY_SET = new Set<string>(ALLOWED_SHIPPING_COUNTRIES);

type CarrierShippingOption = {
  displayName: string;
  amount: number;
  minimumBusinessDays: number;
  maximumBusinessDays: number;
};

type CarrierRateSource = "carrier_api" | "fallback";

type CarrierRateApiResponse = {
  options?: Array<{
    displayName?: unknown;
    amount?: unknown;
    minimumBusinessDays?: unknown;
    maximumBusinessDays?: unknown;
  }>;
};

function resolveDestinationCountry(request: Request) {
  const headerCountry =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry");

  const normalized = headerCountry?.trim().toUpperCase();
  if (normalized && ALLOWED_SHIPPING_COUNTRY_SET.has(normalized)) {
    return normalized;
  }

  return "US";
}

function buildDefaultShippingOptions(): CarrierShippingOption[] {
  return [
    {
      displayName: "Free International Shipping",
      amount: 0,
      minimumBusinessDays: 7,
      maximumBusinessDays: 14,
    },
    {
      displayName: "Express International Shipping",
      amount: 2500,
      minimumBusinessDays: 2,
      maximumBusinessDays: 5,
    },
  ];
}

function toStripeShippingOptions(
  shippingOptions: CarrierShippingOption[],
  currency: string,
): StripeShippingOption[] {
  const normalizedCurrency = currency.toLowerCase();

  return shippingOptions.map((option) => ({
    shipping_rate_data: {
      display_name: option.displayName,
      type: "fixed_amount",
      fixed_amount: {
        amount: option.amount,
        currency: normalizedCurrency,
      },
      delivery_estimate: {
        minimum: { unit: "business_day", value: option.minimumBusinessDays },
        maximum: { unit: "business_day", value: option.maximumBusinessDays },
      },
    },
  }));
}

function sanitizeCarrierShippingOptions(
  payload: CarrierRateApiResponse,
): CarrierShippingOption[] {
  if (!Array.isArray(payload.options)) {
    return [];
  }

  return payload.options
    .map((option) => {
      const displayName =
        typeof option.displayName === "string" ? option.displayName.trim() : "";
      const amount =
        typeof option.amount === "number" ? Math.floor(option.amount) : -1;
      const minimumBusinessDays =
        typeof option.minimumBusinessDays === "number"
          ? Math.floor(option.minimumBusinessDays)
          : -1;
      const maximumBusinessDays =
        typeof option.maximumBusinessDays === "number"
          ? Math.floor(option.maximumBusinessDays)
          : -1;

      if (
        !displayName ||
        amount < 0 ||
        minimumBusinessDays < 1 ||
        maximumBusinessDays < minimumBusinessDays
      ) {
        return null;
      }

      return {
        displayName,
        amount,
        minimumBusinessDays,
        maximumBusinessDays,
      } satisfies CarrierShippingOption;
    })
    .filter((option): option is CarrierShippingOption => option !== null)
    .slice(0, 3);
}

async function fetchCarrierShippingOptions(input: {
  currency: string;
  destinationCountry: string;
  subtotal: number;
  items: ResolvedCheckoutItem[];
}) {
  if (!serverEnv.SHIPPING_RATE_API_URL) {
    return null;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (serverEnv.SHIPPING_RATE_API_KEY) {
    headers.Authorization = `Bearer ${serverEnv.SHIPPING_RATE_API_KEY}`;
  }

  try {
    const response = await fetch(serverEnv.SHIPPING_RATE_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        currency: input.currency,
        destinationCountry: input.destinationCountry,
        subtotal: input.subtotal,
        items: input.items.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          unitAmount: item.unitAmount,
        })),
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      monitor.warn("Carrier shipping quote request returned non-OK status.", {
        route: "/api/checkout",
        status: response.status,
        destinationCountry: input.destinationCountry,
      });
      return null;
    }

    const payload = (await response.json()) as CarrierRateApiResponse;
    const options = sanitizeCarrierShippingOptions(payload);
    return options.length > 0 ? options : null;
  } catch (error) {
    monitor.warn("Carrier shipping quote request failed.", {
      route: "/api/checkout",
      destinationCountry: input.destinationCountry,
      error: (error as Error).message,
    });
    return null;
  }
}

async function buildShippingOptions(input: {
  currency: string;
  destinationCountry: string;
  subtotal: number;
  items: ResolvedCheckoutItem[];
}): Promise<{
  source: CarrierRateSource;
  options: StripeShippingOption[];
}> {
  const carrierOptions = await fetchCarrierShippingOptions(input);

  if (carrierOptions && carrierOptions.length > 0) {
    return {
      source: "carrier_api",
      options: toStripeShippingOptions(carrierOptions, input.currency),
    };
  }

  return {
    source: "fallback",
    options: toStripeShippingOptions(
      buildDefaultShippingOptions(),
      input.currency,
    ),
  };
}

async function resolveCheckoutItems(
  inputItems: ReturnType<typeof checkoutSchema.parse>["items"],
  currency: string,
) {
  // Aggregate by variantId + frameId so distinct frame choices stay distinct lines.
  type AggregatedItem = {
    productId: string;
    variantId: string;
    quantity: number;
    image?: string;
    frameId: string | null;
  };

  const aggregatedItems = new Map<string, AggregatedItem>();

  for (const item of inputItems) {
    const frameId = item.frame?.id ?? null;
    const key = `${item.variantId}::${frameId ?? "no-frame"}`;
    const existing = aggregatedItems.get(key);

    if (!existing) {
      aggregatedItems.set(key, {
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        image: item.image,
        frameId,
      });
      continue;
    }

    if (existing.productId !== item.productId) {
      throw new CheckoutResolutionError(
        "Invalid checkout payload for one or more variants.",
        400,
      );
    }

    existing.quantity += item.quantity;
    existing.image = existing.image ?? item.image;
  }

  const variantIds = Array.from(
    new Set(Array.from(aggregatedItems.values()).map((row) => row.variantId)),
  );
  const frameIds = Array.from(
    new Set(
      Array.from(aggregatedItems.values())
        .map((row) => row.frameId)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const [variantRows, frameRows, rates] = await Promise.all([
    productRepository.listCheckoutVariantsByIds(variantIds),
    frameRepository.findByIds(frameIds),
    getExchangeRates(),
  ]);

  const variantsById = new Map(
    variantRows.map((variant) => [variant.variantId, variant]),
  );
  const framesById = new Map(frameRows.map((frame) => [frame.id, frame]));

  const resolvedItems: ResolvedCheckoutItem[] = [];

  for (const requestedItem of aggregatedItems.values()) {
    const variant = variantsById.get(requestedItem.variantId);

    if (!variant) {
      throw new CheckoutResolutionError(
        "One or more items in your cart are no longer available.",
        409,
      );
    }

    if (variant.productId !== requestedItem.productId) {
      throw new CheckoutResolutionError(
        "Invalid checkout payload for one or more variants.",
        400,
      );
    }

    if (variant.productStatus !== "active" || variant.productDeletedAt) {
      throw new CheckoutResolutionError(
        "One or more items in your cart are unavailable right now.",
        409,
      );
    }

    let frameSnapshot: ResolvedCheckoutItem["frame"] = null;
    let frameDeltaUsd = 0;

    if (requestedItem.frameId) {
      const frame = framesById.get(requestedItem.frameId);
      if (!frame || !frame.isActive) {
        throw new CheckoutResolutionError(
          "The selected frame is no longer available.",
          409,
        );
      }
      frameDeltaUsd = frame.priceDelta;
      const frameImageUrl =
        frame.imageBucket && frame.imagePath
          ? resolveUrl({ bucket: frame.imageBucket, path: frame.imagePath })
          : null;
      frameSnapshot = {
        id: frame.id,
        name: frame.name,
        imageUrl: frameImageUrl,
        priceDelta: convertUsdToCurrency(frame.priceDelta, currency, rates),
      };
    }

    const unitAmount = convertUsdToCurrency(
      variant.price + frameDeltaUsd,
      currency,
      rates,
    );

    resolvedItems.push({
      productId: variant.productId,
      variantId: variant.variantId,
      productTitle: variant.productTitle,
      variantTitle: variant.variantTitle,
      sku: variant.sku,
      unitAmount,
      quantity: requestedItem.quantity,
      image: requestedItem.image,
      frame: frameSnapshot,
    });
  }

  return resolvedItems;
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit("strict", request);
  if (limited) return limited;

  try {
    return await handleCheckoutPost(request);
  } catch (error) {
    monitor.error("Checkout handler threw an unhandled error.", error, {
      route: "/api/checkout",
    });

    return NextResponse.json(
      {
        error: "Unable to initialize checkout session.",
        detail:
          process.env.NODE_ENV === "production"
            ? undefined
            : ((error as Error)?.message ?? String(error)),
      },
      { status: 500 },
    );
  }
}

async function handleCheckoutPost(request: Request) {
  if (!stripe) {
    monitor.error("Checkout blocked: Stripe is not configured.", undefined, {
      route: "/api/checkout",
    });

    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 500 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch (error) {
    monitor.warn("Checkout payload rejected: invalid JSON.", {
      route: "/api/checkout",
      error,
    });

    return NextResponse.json(
      { error: "Invalid checkout payload." },
      { status: 400 },
    );
  }

  const parsed = checkoutSchema.safeParse(payload);

  if (!parsed.success) {
    monitor.warn("Checkout payload rejected: schema validation failed.", {
      route: "/api/checkout",
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
      })),
    });

    return NextResponse.json(
      {
        error: "Invalid checkout payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const appUrl = publicEnv.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const currency = parsed.data.currency.toUpperCase();
  const destinationCountry = resolveDestinationCountry(request);
  let resolvedItems: ResolvedCheckoutItem[];

  try {
    resolvedItems = await resolveCheckoutItems(parsed.data.items, currency);
  } catch (error) {
    const isResolutionError = error instanceof CheckoutResolutionError;

    monitor.warn("Checkout payload rejected: item resolution failed.", {
      route: "/api/checkout",
      currency,
      error: isResolutionError ? error.message : (error as Error).message,
    });

    return NextResponse.json(
      {
        error: isResolutionError
          ? error.message
          : "Unable to validate checkout items.",
      },
      { status: isResolutionError ? error.status : 500 },
    );
  }

  const subtotal = resolvedItems.reduce(
    (sum, item) => sum + item.unitAmount * item.quantity,
    0,
  );

  const discountCode = parsed.data.discountCode?.trim().toUpperCase() ?? null;

  // Cart identity. A reload carrying the same signature reuses the existing
  // Stripe session and its reservation instead of reserving stock again. Frame
  // is included because it changes price/line items even at identical stock.
  const cartSignature = checkoutSessionRepository.computeCartSignature({
    currency,
    discountCode,
    items: resolvedItems.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
      frameId: item.frame?.id ?? null,
    })),
  });

  // Reuse path: same cart + a still-open session → return its client secret and
  // reserve nothing. Any mismatch (cart changed), expiry, non-open session, or a
  // failed retrieve releases the stale reservation and falls through to create a
  // fresh session below.
  const existingSessionId = parsed.data.existingSessionId;
  if (existingSessionId) {
    const pendingRow =
      await checkoutSessionRepository.findOpenBySessionId(existingSessionId);

    if (pendingRow) {
      const stillValid =
        pendingRow.cartSignature === cartSignature &&
        pendingRow.expiresAt.getTime() > Date.now();

      if (stillValid) {
        try {
          const existingSession =
            await stripe.checkout.sessions.retrieve(existingSessionId);

          if (
            existingSession.status === "open" &&
            existingSession.client_secret
          ) {
            return NextResponse.json({
              clientSecret: existingSession.client_secret,
              sessionId: existingSession.id,
            });
          }
        } catch (error) {
          monitor.warn(
            "Checkout session reuse failed; creating a new session.",
            {
              route: "/api/checkout",
              sessionId: existingSessionId,
              error: (error as Error).message,
            },
          );
        }
      }

      await checkoutSessionRepository.releaseByRow(pendingRow.id);
    }
  }

  const shipping = await buildShippingOptions({
    currency,
    destinationCountry,
    subtotal,
    items: resolvedItems,
  });

  const codeDiscount = discountCode
    ? await discountRepository.validateForCheckout(
        discountCode,
        subtotal,
        new Date(),
        "code",
      )
    : null;

  if (discountCode && !codeDiscount) {
    monitor.warn("Checkout discount code rejected.", {
      route: "/api/checkout",
      discountCode,
    });

    return NextResponse.json(
      {
        error:
          "Invalid or ineligible discount code for the current order total.",
      },
      { status: 400 },
    );
  }

  const automaticDiscount = !discountCode
    ? await discountRepository.findBestAutomaticForCheckout(subtotal)
    : null;
  const appliedDiscount = codeDiscount ?? automaticDiscount;

  let stripeCouponId: string | undefined;

  if (appliedDiscount && appliedDiscount.amountOff > 0) {
    try {
      const displayCode =
        appliedDiscount.appliesTo.mode === "code"
          ? appliedDiscount.discount.code
          : `AUTO-${appliedDiscount.discount.id.slice(0, 8).toUpperCase()}`;

      if (appliedDiscount.discount.type === "percentage") {
        const coupon = await stripe.coupons.create({
          duration: "once",
          percent_off: Math.min(appliedDiscount.discount.value, 100),
          name: `Code ${displayCode}`,
          metadata: {
            discountId: appliedDiscount.discount.id,
          },
        });

        stripeCouponId = coupon.id;
      }

      if (appliedDiscount.discount.type === "fixed_amount") {
        const coupon = await stripe.coupons.create({
          duration: "once",
          amount_off: appliedDiscount.amountOff,
          currency: currency.toLowerCase(),
          name: `Code ${displayCode}`,
          metadata: {
            discountId: appliedDiscount.discount.id,
          },
        });

        stripeCouponId = coupon.id;
      }
    } catch (error) {
      monitor.error("Checkout discount coupon creation failed.", error, {
        route: "/api/checkout",
        discountId: appliedDiscount.discount.id,
        discountType: appliedDiscount.discount.type,
      });

      return NextResponse.json(
        { error: "Unable to apply discount code to checkout." },
        { status: 500 },
      );
    }
  }

  let session;
  const reservationExpiresAt = new Date(Date.now() + SESSION_TTL_MS);

  try {
    session = await stripe.checkout.sessions.create({
      ui_mode: "elements",
      mode: "payment",
      currency: currency.toLowerCase(),
      // Force card so session creation doesn't depend on the account's
      // dashboard-configured automatic payment methods. Without this, an account
      // with no methods activated for the currency fails create with
      // "No valid payment method types for this Checkout Session".
      payment_method_types: ["card"],
      // Abandoned sessions expire here; the `checkout.session.expired` webhook
      // then releases the reservation made below.
      expires_at: Math.floor(reservationExpiresAt.getTime() / 1000),
      line_items: toStripeLineItems(resolvedItems, currency),
      discounts: stripeCouponId ? [{ coupon: stripeCouponId }] : undefined,
      automatic_tax: {
        enabled: serverEnv.STRIPE_AUTOMATIC_TAX,
      },
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: [...ALLOWED_SHIPPING_COUNTRIES],
      },
      shipping_options: shipping.options,
      metadata: {
        discountId: appliedDiscount?.discount.id ?? "",
        discountCode: appliedDiscount?.discount.code ?? "",
        discountSource: appliedDiscount?.appliesTo.mode ?? "",
        shippingRateSource: shipping.source,
        shippingRateCountry: destinationCountry,
      },
      customer_creation: "always",
      return_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    });
  } catch (error) {
    monitor.error("Checkout session initialization failed.", error, {
      route: "/api/checkout",
      currency,
      itemCount: parsed.data.items.length,
    });

    return NextResponse.json(
      { error: "Unable to initialize checkout session." },
      { status: 500 },
    );
  }

  // Hold stock and record the pending session. Out of stock holds nothing; we
  // then expire the just-created Stripe session so it cannot be paid for stock
  // we do not have.
  const reservation = await checkoutSessionRepository.createSession({
    stripeSessionId: session.id,
    cartSignature,
    currency,
    expiresAt: reservationExpiresAt,
    items: resolvedItems.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity,
    })),
  });

  if (!reservation) {
    monitor.warn("Checkout blocked: insufficient inventory.", {
      route: "/api/checkout",
      sessionId: session.id,
    });

    try {
      await stripe.checkout.sessions.expire(session.id);
    } catch (error) {
      monitor.warn("Failed to expire over-reserved checkout session.", {
        route: "/api/checkout",
        sessionId: session.id,
        error: (error as Error).message,
      });
    }

    return NextResponse.json(
      {
        error:
          "One or more items are out of stock. Please review your cart and try again.",
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    clientSecret: session.client_secret,
    sessionId: session.id,
  });
}
