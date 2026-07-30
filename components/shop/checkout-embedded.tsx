"use client";

import {
  CheckoutElementsProvider,
  CurrencySelectorElement,
  ExpressCheckoutElement,
  PaymentElement,
  ShippingAddressElement,
  useCheckout,
} from "@stripe/react-stripe-js/checkout";
import { loadStripe } from "@stripe/stripe-js";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { PendingButton } from "@/components/ui/pending-button";
import { Spinner } from "@/components/ui/spinner";
import { useCartStore } from "@/lib/store/cart";
import { formatCurrency } from "@/lib/utils/formatters";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

// Brand the Stripe-rendered fields to match the Thanka Treasure palette
// (sharp corners, maroon ink, paper background) so they stop reading as a
// default Stripe demo.
const appearance = {
  theme: "stripe" as const,
  variables: {
    colorPrimary: "#5c1f2a",
    colorBackground: "#fcfaf8",
    colorText: "#5c1f2a",
    colorTextSecondary: "#7a2e3a",
    colorDanger: "#b91c1c",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    borderRadius: "0px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": { border: "1px solid #e8d8d5", boxShadow: "none" },
    ".Input:focus": {
      border: "1px solid #7a2e3a",
      boxShadow: "none",
      outline: "none",
    },
    ".Label": {
      fontSize: "12px",
      letterSpacing: "0.08em",
      textTransform: "uppercase" as const,
      color: "#a07880",
    },
    ".Tab, .Block": { borderRadius: "0px" },
  },
};

type CheckoutResponse = {
  clientSecret?: string;
  sessionId?: string;
  error?: string;
};

// Persists the active Stripe session id across reloads so the server reuses its
// reservation instead of reserving stock again on every checkout page load.
const CHECKOUT_SESSION_STORAGE_KEY = "thanka:checkout-session-id";

function readStoredCheckoutSessionId() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage.getItem(CHECKOUT_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearStoredCheckoutSessionId() {
  writeStoredCheckoutSessionId(null);
}

function writeStoredCheckoutSessionId(sessionId: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (sessionId) {
      window.localStorage.setItem(CHECKOUT_SESSION_STORAGE_KEY, sessionId);
    } else {
      window.localStorage.removeItem(CHECKOUT_SESSION_STORAGE_KEY);
    }
  } catch {
    // localStorage unavailable (private mode / quota) — reuse just degrades to
    // creating a fresh session, no functional break.
  }
}

type SessionState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; clientSecret: string }
  | { status: "error"; message: string };

const STEPS = [
  { key: "contact", label: "Contact" },
  { key: "shipping", label: "Shipping" },
  { key: "payment", label: "Payment" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export function CheckoutEmbedded() {
  const items = useCartStore((state) => state.items);
  const [discountCode, setDiscountCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [session, setSession] = useState<SessionState>({ status: "idle" });
  // Dedupes session creation: each create reserves inventory server-side, so we
  // must fire exactly once per cart/discount signature. Survives React Strict
  // Mode's double-invoked effect (same instance keeps the ref).
  const requestedKeyRef = useRef<string | null>(null);
  const fieldId = useId();
  const discountInputId = `${fieldId}-discount-code`;

  const cartCurrencies = useMemo(
    () => [...new Set(items.map((item) => item.currency.toUpperCase()))],
    [items],
  );
  const checkoutCurrency = cartCurrencies[0] ?? "USD";
  const hasMixedCurrencies = cartCurrencies.length > 1;

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [items],
  );

  // Create (or re-create on discount apply) a Custom Checkout session. The
  // session bakes in the validated discount, shipping options, and automatic
  // tax server-side; the client only drives the UI.
  useEffect(() => {
    if (items.length === 0 || hasMixedCurrencies || !stripePromise) {
      return;
    }

    const requestKey = JSON.stringify({
      currency: checkoutCurrency,
      appliedCode,
      items: items.map((item) => ({
        v: item.variantId,
        f: item.frame?.id ?? null,
        q: item.quantity,
      })),
    });

    // Already created (or creating) a session for this exact cart+discount —
    // skip so Strict Mode / re-renders don't reserve inventory twice.
    if (requestedKeyRef.current === requestKey) {
      return;
    }
    requestedKeyRef.current = requestKey;

    let cancelled = false;

    (async () => {
      setSession({ status: "loading" });
      try {
        const response = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currency: checkoutCurrency,
            discountCode: appliedCode.length > 0 ? appliedCode : undefined,
            existingSessionId: readStoredCheckoutSessionId() ?? undefined,
            items: items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              image: item.imageUrl,
              frame: item.frame
                ? {
                    id: item.frame.id,
                    name: item.frame.name,
                    imageUrl: item.frame.imageUrl,
                  }
                : undefined,
            })),
          }),
        });

        const payload = (await response
          .json()
          .catch(() => ({}))) as CheckoutResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok || !payload.clientSecret) {
          requestedKeyRef.current = null;
          // Drop the stored id so the next attempt starts clean instead of
          // retrying a session the server already rejected.
          writeStoredCheckoutSessionId(null);
          setSession({
            status: "error",
            message: payload.error ?? "Unable to initialize checkout.",
          });
          return;
        }

        if (payload.sessionId) {
          writeStoredCheckoutSessionId(payload.sessionId);
        }

        setSession({ status: "ready", clientSecret: payload.clientSecret });
      } catch {
        if (!cancelled) {
          requestedKeyRef.current = null;
          setSession({
            status: "error",
            message: "Unable to reach the payment service. Please try again.",
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // appliedCode change re-creates the session with the new discount baked in.
  }, [items, checkoutCurrency, hasMixedCurrencies, appliedCode]);

  if (items.length === 0) {
    return (
      <div className="mt-8 border border-border-light bg-white p-6 text-sm text-warm-gray-700">
        <p>Your cart is empty, so checkout is not available yet.</p>
        <Link
          href="/products"
          className="mt-3 inline-flex text-sm font-medium text-maroon-700 hover:text-maroon-600"
        >
          Browse products
        </Link>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="mt-8 border border-border-light bg-white p-6 text-sm text-warm-gray-700">
        <p>
          Stripe checkout is not configured. Set
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to enable payments.
        </p>
      </div>
    );
  }

  if (hasMixedCurrencies) {
    return (
      <div className="mt-8 border border-border-light bg-white p-6 text-sm text-red-700">
        Your cart contains multiple currencies. Clear your cart and re-add items
        using a single currency before checkout.
      </div>
    );
  }

  const summaryAside = (
    <OrderSummary
      items={items}
      fallbackCurrency={checkoutCurrency}
      fallbackSubtotal={subtotal}
      discountInputId={discountInputId}
      discountCode={discountCode}
      appliedCode={appliedCode}
      onDiscountChange={setDiscountCode}
      onApplyDiscount={() => setAppliedCode(discountCode.trim().toUpperCase())}
      onClearDiscount={() => {
        setDiscountCode("");
        setAppliedCode("");
      }}
    />
  );

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        {session.status === "error" ? (
          <div className="border border-border-light bg-white p-6 text-sm text-red-700">
            {session.message}
          </div>
        ) : session.status === "ready" ? (
          <CheckoutElementsProvider
            stripe={stripePromise}
            options={{
              clientSecret: session.clientSecret,
              adaptivePricing: { allowed: true },
              elementsOptions: { appearance },
            }}
          >
            <CheckoutFlow />
          </CheckoutElementsProvider>
        ) : (
          <div className="space-y-4 border border-border-light bg-white p-6">
            <div className="h-6 w-32 animate-pulse bg-paper-3" />
            <div className="h-11 w-full animate-pulse bg-paper-3" />
            <div className="h-11 w-full animate-pulse bg-paper-3" />
            <div className="h-11 w-2/3 animate-pulse bg-paper-3" />
          </div>
        )}
      </div>

      {summaryAside}
    </div>
  );
}

function Stepper({ active }: { active: StepKey }) {
  const activeIndex = STEPS.findIndex((step) => step.key === active);

  return (
    <ol className="flex items-center gap-2 text-xs">
      {STEPS.map((step, index) => {
        const state =
          index < activeIndex
            ? "done"
            : index === activeIndex
              ? "active"
              : "todo";

        return (
          <li key={step.key} className="flex flex-1 items-center gap-2">
            <span
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center border text-[11px] font-medium",
                state === "active"
                  ? "border-maroon-800 bg-maroon-800 text-white"
                  : state === "done"
                    ? "border-maroon-800 bg-white text-maroon-800"
                    : "border-border-light bg-white text-warm-gray-500",
              ].join(" ")}
            >
              {state === "done" ? "✓" : index + 1}
            </span>
            <span
              className={[
                "uppercase tracking-[0.08em]",
                state === "todo" ? "text-warm-gray-500" : "text-maroon-900",
              ].join(" ")}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 ? (
              <span
                className={[
                  "ml-1 hidden h-px flex-1 sm:block",
                  index < activeIndex ? "bg-maroon-800" : "bg-border-light",
                ].join(" ")}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function CheckoutFlow() {
  const checkoutState = useCheckout();
  const [step, setStep] = useState<StepKey>("contact");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [addressComplete, setAddressComplete] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (checkoutState.type === "loading") {
    return (
      <div className="space-y-4 border border-border-light bg-white p-6">
        <div className="h-6 w-32 animate-pulse bg-paper-3" />
        <div className="h-11 w-full animate-pulse bg-paper-3" />
      </div>
    );
  }

  if (checkoutState.type === "error") {
    return (
      <div className="border border-border-light bg-white p-6 text-sm text-red-700">
        {checkoutState.error.message}
      </div>
    );
  }

  const checkout = checkoutState.checkout;

  const handleEmailContinue = async () => {
    setEmailError(null);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    const result = await checkout.updateEmail(trimmed);
    if (result.type === "error") {
      setEmailError(result.error.message);
      return;
    }
    setStep("shipping");
  };

  const handleShippingContinue = async () => {
    setShippingError(null);
    if (!selectedShipping && checkout.shippingOptions.length > 0) {
      setShippingError("Choose a shipping method.");
      return;
    }
    setStep("payment");
  };

  const handleSelectShipping = async (optionId: string) => {
    setShippingError(null);
    const previous = selectedShipping;
    setSelectedShipping(optionId);
    const result = await checkout.updateShippingOption(optionId);
    if (result.type === "error") {
      setSelectedShipping(previous);
      setShippingError(result.error.message);
    }
  };

  const handlePay = async () => {
    setPayError(null);
    setSubmitting(true);
    const result = await checkout.confirm({
      returnUrl: `${window.location.origin}/checkout/success?session_id=${checkout.id}`,
    });
    if (result.type === "error") {
      setPayError(result.error.message);
      setSubmitting(false);
    }
    // On success Stripe redirects to the return URL.
  };

  return (
    <div className="space-y-6">
      <div className="border border-border-light bg-white p-5">
        <Stepper active={step} />
      </div>

      {step === "contact" ? (
        <section className="space-y-5 border border-border-light bg-white p-5 md:p-6">
          <ExpressCheckoutSlot />
          <CurrencySelectorElement />

          <div>
            <h2 className="font-serif text-2xl text-maroon-900">
              Contact details
            </h2>
            <label
              htmlFor="checkout-email"
              className="mt-4 block text-xs uppercase tracking-[0.08em] text-warm-gray-500"
            >
              Email
            </label>
            <input
              id="checkout-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@example.com"
              className="mt-1 h-11 w-full border border-border-light bg-white px-3 text-sm text-warm-gray-900 focus:border-maroon-600 focus:outline-none"
            />
            {emailError ? (
              <p role="alert" className="mt-2 text-sm text-red-700">
                {emailError}
              </p>
            ) : null}
            <p className="mt-2 text-xs text-warm-gray-500">
              We&apos;ll send your order confirmation here.
            </p>
          </div>

          <PendingButton
            onClick={handleEmailContinue}
            pendingLabel="Saving…"
            className="inline-flex h-11 w-full items-center justify-center gap-2 bg-maroon-800 text-sm font-medium uppercase tracking-[0.08em] text-white transition-colors enabled:hover:bg-maroon-700"
          >
            Continue to shipping
          </PendingButton>
        </section>
      ) : null}

      {step === "shipping" ? (
        <section className="space-y-5 border border-border-light bg-white p-5 md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-maroon-900">
              Shipping address
            </h2>
            <button
              type="button"
              onClick={() => setStep("contact")}
              className="text-xs uppercase tracking-[0.08em] text-warm-gray-500 hover:text-maroon-700"
            >
              ← Back
            </button>
          </div>

          <ShippingAddressElement
            onChange={(event) => {
              setAddressComplete(event.complete);
            }}
          />

          {checkout.shippingOptions.length > 0 ? (
            <fieldset className="space-y-2">
              <legend className="text-xs uppercase tracking-[0.08em] text-warm-gray-500">
                Shipping method
              </legend>
              {checkout.shippingOptions.map((option) => {
                const selected = selectedShipping === option.id;
                return (
                  <label
                    key={option.id}
                    className={[
                      "flex cursor-pointer items-center justify-between gap-3 border p-3 text-sm",
                      selected
                        ? "border-maroon-800 bg-paper-2"
                        : "border-border-light bg-white",
                    ].join(" ")}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="shipping-method"
                        checked={selected}
                        onChange={() => handleSelectShipping(option.id)}
                        className="accent-maroon-800"
                      />
                      <span>
                        <span className="block text-maroon-900">
                          {option.displayName}
                        </span>
                        {option.deliveryEstimate ? (
                          <span className="block text-xs text-warm-gray-500">
                            {formatDeliveryEstimate(option.deliveryEstimate)}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="text-maroon-900">
                      {option.minorUnitsAmount === 0 ? "Free" : option.amount}
                    </span>
                  </label>
                );
              })}
            </fieldset>
          ) : null}

          {shippingError ? (
            <p role="alert" className="text-sm text-red-700">
              {shippingError}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleShippingContinue}
            disabled={!addressComplete}
            className="h-11 w-full bg-maroon-800 text-sm font-medium uppercase tracking-[0.08em] text-white transition-colors hover:bg-maroon-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue to payment
          </button>
        </section>
      ) : null}

      {step === "payment" ? (
        <section className="space-y-5 border border-border-light bg-white p-5 md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-maroon-900">Payment</h2>
            <button
              type="button"
              onClick={() => setStep("shipping")}
              className="text-xs uppercase tracking-[0.08em] text-warm-gray-500 hover:text-maroon-700"
            >
              ← Back
            </button>
          </div>

          <PaymentElement options={{ layout: "tabs" }} />

          {payError ? (
            <p role="alert" className="text-sm text-red-700">
              {payError}
            </p>
          ) : null}

          {/* Keeps its own `submitting` flag rather than using PendingButton:
              on success Stripe redirects away, so the button must stay busy
              until the page unloads instead of resetting when confirm()
              resolves. */}
          <button
            type="button"
            onClick={handlePay}
            disabled={submitting || !checkout.canConfirm}
            aria-busy={submitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 bg-maroon-800 text-sm font-medium uppercase tracking-[0.08em] text-white transition-colors enabled:hover:bg-maroon-700 disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress"
          >
            {submitting ? (
              <>
                <Spinner />
                Processing…
              </>
            ) : (
              `Pay ${checkout.total.total.amount}`
            )}
          </button>
          <p className="text-center text-xs text-warm-gray-500">
            Secured by Stripe. Your card details never touch our servers.
          </p>
        </section>
      ) : null}
    </div>
  );
}

// Express wallets (Link, Apple Pay, Google Pay). Renders nothing when no
// wallet is available, so the surrounding divider is hidden too.
function ExpressCheckoutSlot() {
  const checkoutState = useCheckout();
  const [available, setAvailable] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (checkoutState.type !== "success") {
      return;
    }
    await checkoutState.checkout.confirm({
      returnUrl: `${window.location.origin}/checkout/success?session_id=${checkoutState.checkout.id}`,
    });
  }, [checkoutState]);

  if (checkoutState.type !== "success") {
    return null;
  }

  return (
    <div className={available ? "space-y-4" : "hidden"}>
      <ExpressCheckoutElement
        onReady={(event) => {
          setAvailable(
            Boolean(event.availablePaymentMethods),
          );
        }}
        onConfirm={handleConfirm}
      />
      <div className="flex items-center gap-3 text-xs uppercase tracking-[0.08em] text-warm-gray-500">
        <span className="h-px flex-1 bg-border-light" />
        or pay by card
        <span className="h-px flex-1 bg-border-light" />
      </div>
    </div>
  );
}

type OrderSummaryProps = {
  items: ReturnType<typeof useCartStore.getState>["items"];
  fallbackCurrency: string;
  fallbackSubtotal: number;
  discountInputId: string;
  discountCode: string;
  appliedCode: string;
  onDiscountChange: (value: string) => void;
  onApplyDiscount: () => void;
  onClearDiscount: () => void;
};

function OrderSummary({
  items,
  fallbackCurrency,
  fallbackSubtotal,
  discountInputId,
  discountCode,
  appliedCode,
  onDiscountChange,
  onApplyDiscount,
  onClearDiscount,
}: OrderSummaryProps) {
  return (
    <aside className="h-fit border border-border-light bg-white p-5 lg:sticky lg:top-24">
      <h2 className="font-serif text-2xl text-maroon-900">Order summary</h2>

      <ul className="mt-4 space-y-3 text-sm text-warm-gray-700">
        {items.map((item) => (
          <li
            key={
              item.frame
                ? `${item.variantId}::${item.frame.id}`
                : item.variantId
            }
            className="flex items-start gap-3"
          >
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.title}
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 border border-border-light object-cover"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="truncate text-maroon-900">{item.title}</p>
              {item.variantTitle ? (
                <p className="text-xs text-warm-gray-500">
                  {item.variantTitle}
                </p>
              ) : null}
              {item.frame ? (
                <p className="text-xs text-warm-gray-500">
                  Frame: {item.frame.name}
                </p>
              ) : null}
              <p className="text-xs text-warm-gray-500">Qty {item.quantity}</p>
            </div>
            <span className="shrink-0">
              {formatCurrency(
                item.unitPrice * item.quantity,
                item.currency.toUpperCase(),
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-border-light pt-4">
        <label
          htmlFor={discountInputId}
          className="block text-xs uppercase tracking-[0.08em] text-warm-gray-500"
        >
          Discount code
        </label>
        {appliedCode ? (
          <div className="mt-1 flex items-center justify-between gap-2 border border-maroon-800 bg-paper-2 px-3 py-2 text-sm text-maroon-900">
            <span>
              <span className="font-medium">{appliedCode}</span> applied
            </span>
            <button
              type="button"
              onClick={onClearDiscount}
              className="text-xs uppercase tracking-[0.08em] text-warm-gray-500 hover:text-maroon-700"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="mt-1 flex gap-2">
            <input
              id={discountInputId}
              type="text"
              value={discountCode}
              onChange={(event) =>
                onDiscountChange(event.target.value.toUpperCase())
              }
              placeholder="WELCOME10"
              className="h-10 flex-1 border border-border-light bg-white px-3 text-sm text-warm-gray-900 focus:border-maroon-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={onApplyDiscount}
              disabled={discountCode.trim().length === 0}
              className="h-10 shrink-0 border border-maroon-800 px-4 text-xs font-medium uppercase tracking-[0.08em] text-maroon-800 transition-colors hover:bg-maroon-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-border-light pt-4 text-sm text-warm-gray-700">
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span className="font-medium text-maroon-900">
            {formatCurrency(fallbackSubtotal, fallbackCurrency)}
          </span>
        </div>
        <p className="mt-2 text-xs text-warm-gray-500">
          Shipping and taxes are calculated from your address in the payment
          steps. The Pay button shows your final total.
        </p>
      </div>
    </aside>
  );
}

function formatDeliveryEstimate(estimate: {
  minimum: { unit: string; value: number } | null;
  maximum: { unit: string; value: number } | null;
}) {
  const min = estimate.minimum?.value;
  const max = estimate.maximum?.value;
  const unit = estimate.maximum?.unit ?? estimate.minimum?.unit ?? "business_day";
  const label = unit.replace("_", " ") + (max && max > 1 ? "s" : "");
  if (min && max) {
    return `${min}–${max} ${label}`;
  }
  if (max) {
    return `Up to ${max} ${label}`;
  }
  return "";
}
