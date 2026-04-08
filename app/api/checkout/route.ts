import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { convertUsdToCurrency, getExchangeRates } from "@/lib/currency/context";
import { publicEnv, serverEnv } from "@/lib/env";
import { monitor } from "@/lib/monitoring/logger";
import { discountRepository } from "@/lib/repositories/discount-repository";
import { inventoryRepository } from "@/lib/repositories/inventory-repository";
import { productRepository } from "@/lib/repositories/product-repository";
import { stripe } from "@/lib/stripe/client";
import { toStripeLineItems } from "@/lib/stripe/helpers";
import { checkoutSchema } from "@/lib/utils/validators";

type ReservedInventory = {
  variantId: string;
  quantity: number;
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

const ALLOWED_SHIPPING_COUNTRY_SET = new Set(ALLOWED_SHIPPING_COUNTRIES);

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

function buildDefaultShippingOptions(
  currency: string,
): CarrierShippingOption[] {
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
): Stripe.Checkout.SessionCreateParams.ShippingOption[] {
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

function buildShippingOptions(input: {
  currency: string;
  destinationCountry: string;
  subtotal: number;
  items: ResolvedCheckoutItem[];
}): Promise<{
  source: CarrierRateSource;
  options: Stripe.Checkout.SessionCreateParams.ShippingOption[];
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
      buildDefaultShippingOptions(input.currency),
      input.currency,
    ),
  };
}

async function releaseReservations(items: ReservedInventory[]) {
  await Promise.allSettled(
    items.map((item) =>
      inventoryRepository.release(item.variantId, item.quantity),
    ),
  );
}

async function resolveCheckoutItems(
  inputItems: ReturnType<typeof checkoutSchema.parse>["items"],
  currency: string,
) {
  const aggregatedItems = new Map<
    string,
    { productId: string; quantity: number; image?: string }
  >();

  for (const item of inputItems) {
    const existing = aggregatedItems.get(item.variantId);

    if (!existing) {
      aggregatedItems.set(item.variantId, {
        productId: item.productId,
        quantity: item.quantity,
        image: item.image,
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

  const [variantRows, rates] = await Promise.all([
    productRepository.listCheckoutVariantsByIds([...aggregatedItems.keys()]),
    getExchangeRates(),
  ]);

  const variantsById = new Map(
    variantRows.map((variant) => [variant.variantId, variant]),
  );

  const resolvedItems: ResolvedCheckoutItem[] = [];

  for (const [variantId, requestedItem] of aggregatedItems) {
    const variant = variantsById.get(variantId);

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

    resolvedItems.push({
      productId: variant.productId,
      variantId: variant.variantId,
      productTitle: variant.productTitle,
      variantTitle: variant.variantTitle,
      sku: variant.sku,
      unitAmount: convertUsdToCurrency(variant.price, currency, rates),
      quantity: requestedItem.quantity,
      image: requestedItem.image,
    });
  }

  return resolvedItems;
}

export async function POST(request: Request) {
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

  const shipping = await buildShippingOptions({
    currency,
    destinationCountry,
    subtotal,
    items: resolvedItems,
  });

  const reservedInventory: ReservedInventory[] = [];

  const discountCode = parsed.data.discountCode?.trim().toUpperCase();
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

  for (const item of resolvedItems) {
    const inventoryRow = await inventoryRepository.findByVariantId(
      item.variantId,
    );

    if (!inventoryRow) {
      continue;
    }

    const reserved = await inventoryRepository.reserve(
      item.variantId,
      item.quantity,
    );
    if (!reserved) {
      monitor.warn("Checkout blocked: insufficient inventory.", {
        route: "/api/checkout",
        variantId: item.variantId,
        requestedQuantity: item.quantity,
      });

      await releaseReservations(reservedInventory);
      return NextResponse.json(
        {
          error:
            "One or more items are out of stock. Please review your cart and try again.",
        },
        { status: 409 },
      );
    }

    reservedInventory.push({
      variantId: item.variantId,
      quantity: item.quantity,
    });
  }

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

      await releaseReservations(reservedInventory);
      return NextResponse.json(
        { error: "Unable to apply discount code to checkout." },
        { status: 500 },
      );
    }
  }

  let session;
  try {
    session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      currency: currency.toLowerCase(),
      line_items: toStripeLineItems(resolvedItems, currency),
      discounts: stripeCouponId ? [{ coupon: stripeCouponId }] : undefined,
      automatic_tax: {
        enabled: true,
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
      reservedCount: reservedInventory.length,
    });

    await releaseReservations(reservedInventory);
    return NextResponse.json(
      { error: "Unable to initialize checkout session." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    clientSecret: session.client_secret,
    sessionId: session.id,
  });
}
