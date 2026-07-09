"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import { Icon } from "@/components/admin/ui";
import type { PosLookupResult } from "@/lib/repositories/product-repository";
import { formatCurrency } from "@/lib/utils/formatters";

import {
  completePosSaleAction,
  lookupPosProductAction,
  searchPosProductsAction,
} from "./actions";
import { CartPanel } from "./cart-panel";
import { CheckoutPanel } from "./checkout-panel";
import { ConfirmDialog } from "./confirm-dialog";
import { ProductGrid } from "./product-grid";
import { Receipt } from "./receipt";
import { StagingTray } from "./staging-tray";
import { SuccessScreen } from "./success-screen";
import type {
  CartLine,
  CompletedSale,
  PaymentMethod,
  StagedLine,
} from "./types";

export function PosKiosk({
  initialProducts,
  brandName,
}: {
  initialProducts: PosLookupResult[];
  brandName: string;
}) {
  const [code, setCode] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [staged, setStaged] = useState<StagedLine[]>([]);
  const stagedKey = useRef(0);

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PosLookupResult[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [discount, setDiscount] = useState("");
  const [discountMode, setDiscountMode] = useState<"amount" | "percent">(
    "amount",
  );
  const [cashReceived, setCashReceived] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");

  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<CartLine | null>(null);

  const [isLooking, startLookup] = useTransition();
  const [isSearching, startSearch] = useTransition();
  const [isCompleting, startComplete] = useTransition();

  const scanRef = useRef<HTMLInputElement>(null);

  const subtotal = cart.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );
  const discountInput = Math.max(0, Number.parseFloat(discount) || 0);
  const rawDiscountMinor =
    discountMode === "percent"
      ? Math.round((subtotal * Math.min(discountInput, 100)) / 100)
      : Math.round(discountInput * 100);
  const discountMinor = Math.min(subtotal, rawDiscountMinor);
  const grandTotal = Math.max(0, subtotal - discountMinor);

  const cashMinor =
    cashReceived.trim() === ""
      ? null
      : Math.round((Number.parseFloat(cashReceived) || 0) * 100);
  const changeDueMinor =
    paymentMethod === "cash" && cashMinor !== null
      ? cashMinor - grandTotal
      : null;

  function focusScanner() {
    requestAnimationFrame(() => scanRef.current?.focus());
  }

  // Empty query shows the initial list; a typed query shows debounced results.
  const trimmedQuery = query.trim();
  const gridItems = trimmedQuery === "" ? initialProducts : searchResults;

  // Debounced name search.
  useEffect(() => {
    const needle = query.trim();
    if (needle === "") return;
    const handle = setTimeout(() => {
      startSearch(async () => {
        const results = await searchPosProductsAction(needle);
        setSearchResults(results);
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  // Add a looked-up/tapped product to the staging tray (not the cart yet).
  // Repeated picks of the same resolved variant just bump its quantity so
  // rapid scanning of the same item stacks neatly instead of piling up rows.
  function stageProduct(result: PosLookupResult) {
    const defaultVariant =
      result.variants.length === 1 ? result.variants[0].variantId : null;

    setStaged((prev) => {
      const match = prev.find(
        (line) =>
          line.result.productId === result.productId &&
          line.variantId === defaultVariant,
      );
      if (match) {
        return prev.map((line) =>
          line.key === match.key
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      stagedKey.current += 1;
      return [
        ...prev,
        {
          key: `s${stagedKey.current}`,
          result,
          variantId: defaultVariant,
          quantity: 1,
        },
      ];
    });
  }

  function handleScan(event: React.FormEvent) {
    event.preventDefault();
    const needle = code.trim();
    if (!needle) return;

    startLookup(async () => {
      const result = await lookupPosProductAction(needle);
      setCode("");
      focusScanner();
      if (!result || result.variants.length === 0) {
        toast.error(`No product found for “${needle}”.`);
        return;
      }
      stageProduct(result);
    });
  }

  function setStagedVariant(key: string, variantId: string) {
    setStaged((prev) =>
      prev.map((line) =>
        line.key === key ? { ...line, variantId } : line,
      ),
    );
  }

  function setStagedQuantity(key: string, quantity: number) {
    setStaged((prev) =>
      prev
        .map((line) =>
          line.key === key ? { ...line, quantity } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function removeStaged(key: string) {
    setStaged((prev) => prev.filter((line) => line.key !== key));
  }

  // Merge one staged line into the cart, capping at available stock.
  function mergeIntoCart(
    result: PosLookupResult,
    variantId: string,
    quantity: number,
  ): { capped: boolean } {
    const variant = result.variants.find((v) => v.variantId === variantId);
    if (!variant) return { capped: false };

    let capped = false;
    setCart((prev) => {
      const existing = prev.find((line) => line.variantId === variantId);
      const currentQty = existing?.quantity ?? 0;
      const nextQty = Math.min(
        currentQty + quantity,
        Math.max(variant.availableQuantity, 0),
      );
      if (nextQty < currentQty + quantity) capped = true;
      if (nextQty <= currentQty) return prev;

      if (existing) {
        return prev.map((line) =>
          line.variantId === variantId
            ? { ...line, quantity: nextQty }
            : line,
        );
      }
      return [
        ...prev,
        {
          variantId,
          productTitle: result.productTitle,
          variantTitle: variant.title,
          sku: variant.sku,
          unitPrice: variant.price,
          quantity: nextQty,
          availableQuantity: variant.availableQuantity,
          imageUrl: result.imageUrl,
        },
      ];
    });
    return { capped };
  }

  // Confirm the whole staging tray into the cart in one go.
  function confirmStaged() {
    const ready = staged.filter((line) => line.variantId !== null);
    if (ready.length === 0) return;

    let cappedAny = false;
    let count = 0;
    for (const line of ready) {
      const { capped } = mergeIntoCart(
        line.result,
        line.variantId as string,
        line.quantity,
      );
      if (capped) cappedAny = true;
      count += line.quantity;
    }

    setStaged([]);
    focusScanner();
    if (cappedAny) {
      toast.warning("Some items were limited by available stock.");
    } else {
      toast.success(`Added ${count} item${count === 1 ? "" : "s"} to cart.`);
    }
  }

  function increase(variantId: string) {
    setCart((prev) =>
      prev.map((line) =>
        line.variantId === variantId
          ? {
              ...line,
              quantity: Math.min(line.quantity + 1, line.availableQuantity),
            }
          : line,
      ),
    );
  }

  function decrease(variantId: string) {
    setCart((prev) =>
      prev
        .map((line) =>
          line.variantId === variantId
            ? { ...line, quantity: line.quantity - 1 }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function removeLine(variantId: string) {
    setCart((prev) => prev.filter((line) => line.variantId !== variantId));
  }

  function resetSale() {
    setCart([]);
    setDiscount("");
    setDiscountMode("amount");
    setCashReceived("");
    setCustomerEmail("");
    setCustomerName("");
    setPaymentMethod("cash");
    setStaged([]);
    setCompletedSale(null);
    focusScanner();
  }

  // productId → total quantity sitting in the staging tray (for grid badges).
  const stagedCounts = staged.reduce<Record<string, number>>((acc, line) => {
    acc[line.result.productId] = (acc[line.result.productId] ?? 0) + line.quantity;
    return acc;
  }, {});

  function completeSale() {
    if (cart.length === 0) {
      toast.error("Cart is empty.");
      return;
    }

    startComplete(async () => {
      const result = await completePosSaleAction({
        items: cart.map((line) => ({
          variantId: line.variantId,
          quantity: line.quantity,
        })),
        paymentMethod,
        customerEmail: customerEmail.trim() || undefined,
        customerName: customerName.trim() || undefined,
        // Always send the resolved dollar amount, whether entered as $ or %.
        discount: discountMinor > 0 ? discountMinor / 100 : undefined,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const soldAt = new Date().toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });

      setCompletedSale({
        orderNumber: result.orderNumber,
        lines: cart,
        subtotal,
        discountMinor,
        grandTotal: result.grandTotal,
        paymentMethod,
        cashReceivedMinor: paymentMethod === "cash" ? cashMinor : null,
        changeDueMinor:
          paymentMethod === "cash" && changeDueMinor !== null
            ? changeDueMinor
            : null,
        customerName: customerName.trim() || null,
        soldAt,
      });
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
      {/* LEFT — find & add products */}
      <div className="space-y-4">
        <form
          onSubmit={handleScan}
          className="flex gap-2 rounded-2xl p-3"
          style={{
            background: "var(--admin-surface)",
            border: "1px solid var(--admin-border)",
            boxShadow: "var(--admin-shadow)",
          }}
        >
          <div className="relative flex-1">
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--admin-text-mute)" }}
            >
              <Icon.Barcode width={24} height={24} />
            </span>
            <input
              ref={scanRef}
              autoFocus
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Scan barcode (or type code)…"
              aria-label="Scan barcode or type a code"
              className="h-14 w-full rounded-xl pl-12 pr-3 text-lg focus:outline-none focus:ring-2 focus:ring-(--admin-accent)"
              style={{
                background: "var(--admin-bg)",
                border: "1px solid var(--admin-border-strong)",
                color: "var(--admin-text)",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={isLooking}
            className="inline-flex h-14 items-center gap-2 rounded-xl px-6 text-lg font-bold transition hover:brightness-110 disabled:opacity-50"
            style={{
              background: "var(--admin-accent)",
              color: "var(--admin-on-accent)",
            }}
          >
            {isLooking ? "Finding…" : "Find"}
          </button>
        </form>

        {staged.length > 0 ? (
          <StagingTray
            lines={staged}
            onSetVariant={setStagedVariant}
            onSetQuantity={setStagedQuantity}
            onRemove={removeStaged}
            onClear={() => {
              setStaged([]);
              focusScanner();
            }}
            onConfirm={confirmStaged}
          />
        ) : null}

        <ProductGrid
          items={gridItems}
          query={query}
          loading={isSearching}
          stagedCounts={stagedCounts}
          onQueryChange={setQuery}
          onPick={stageProduct}
        />
      </div>

      {/* RIGHT — cart & pay. Fixed-height column: order area scrolls, the
          Charge bar stays pinned so it never drops below the fold. */}
      <div className="flex flex-col gap-3 lg:sticky lg:top-20 lg:h-[calc(100dvh-6rem)]">
        <div className="flex shrink-0 items-center justify-between">
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--admin-text)" }}
          >
            Cart{cart.length > 0 ? ` · ${cart.length}` : ""}
          </h2>
          {cart.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition hover:bg-(--admin-accent-soft)"
              style={{ color: "var(--admin-danger)" }}
            >
              <Icon.Trash width={16} height={16} />
              Clear
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto lg:pr-1">
          <CartPanel
            lines={cart}
            onIncrease={increase}
            onDecrease={decrease}
            onRemove={(variantId) => {
              const line = cart.find((l) => l.variantId === variantId) ?? null;
              setPendingRemove(line);
            }}
          />

          <div
            className="rounded-xl p-3"
            style={{
              background: "var(--admin-surface)",
              border: "1px solid var(--admin-border)",
              boxShadow: "var(--admin-shadow)",
            }}
          >
            <CheckoutPanel
              subtotal={subtotal}
              discount={discount}
              discountMode={discountMode}
              discountMinor={discountMinor}
              grandTotal={grandTotal}
              paymentMethod={paymentMethod}
              cashReceived={cashReceived}
              changeDueMinor={changeDueMinor}
              customerName={customerName}
              customerEmail={customerEmail}
              onDiscountChange={setDiscount}
              onDiscountModeChange={setDiscountMode}
              onPaymentMethodChange={setPaymentMethod}
              onCashReceivedChange={setCashReceived}
              onCustomerNameChange={setCustomerName}
              onCustomerEmailChange={setCustomerEmail}
            />
          </div>
        </div>

        {/* Pinned pay bar — always visible regardless of cart length */}
        <button
          type="button"
          onClick={completeSale}
          disabled={cart.length === 0 || isCompleting}
          className="flex h-16 shrink-0 items-center justify-center gap-3 rounded-2xl text-xl font-bold transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: "var(--admin-accent)",
            color: "var(--admin-on-accent)",
            boxShadow: "var(--admin-shadow)",
          }}
        >
          <Icon.Check width={26} height={26} />
          {isCompleting
            ? "Completing…"
            : `Charge · ${formatCurrency(grandTotal)}`}
        </button>
      </div>

      {/* Overlays */}
      {showClearConfirm ? (
        <ConfirmDialog
          title="Clear the cart?"
          message="This removes every item. You can't undo this."
          confirmLabel="Clear cart"
          cancelLabel="Keep"
          danger
          onConfirm={() => {
            setCart([]);
            setShowClearConfirm(false);
            focusScanner();
          }}
          onCancel={() => setShowClearConfirm(false)}
        />
      ) : null}

      {pendingRemove ? (
        <ConfirmDialog
          title="Remove this item?"
          message={pendingRemove.productTitle}
          confirmLabel="Remove"
          cancelLabel="Keep"
          danger
          onConfirm={() => {
            removeLine(pendingRemove.variantId);
            setPendingRemove(null);
            focusScanner();
          }}
          onCancel={() => setPendingRemove(null)}
        />
      ) : null}

      {completedSale ? (
        <>
          <SuccessScreen
            sale={completedSale}
            onPrint={() => window.print()}
            onNewSale={resetSale}
          />
          <Receipt sale={completedSale} brandName={brandName} />
        </>
      ) : null}
    </div>
  );
}
