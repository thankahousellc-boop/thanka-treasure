import { createDiscountAction } from "../actions";

import { ButtonLink, SubmitButton } from "@/components/admin/ui";

export default function AdminNewDiscountPage() {
  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold text-(--admin-text)">
          Create discount
        </h2>
        <ButtonLink href="/admin/discounts" variant="secondary" size="sm">
          Back to discounts
        </ButtonLink>
      </div>

      <form
        action={createDiscountAction}
        className="grid gap-4 rounded border border-(--admin-border) bg-(--admin-surface) p-5 md:grid-cols-2"
      >
        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
            Code
          </span>
          <input
            name="code"
            required
            placeholder="WELCOME10"
            className="h-10 w-full rounded border border-(--admin-border-strong) bg-(--admin-surface) px-3 text-sm text-(--admin-text)"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
            Type
          </span>
          <select
            name="type"
            defaultValue="percentage"
            className="h-10 w-full rounded border border-(--admin-border-strong) bg-(--admin-surface) px-3 text-sm text-(--admin-text)"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed_amount">Fixed amount</option>
            <option value="free_shipping">Free shipping</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
            Apply mode
          </span>
          <select
            name="applyMode"
            defaultValue="code"
            className="h-10 w-full rounded border border-(--admin-border-strong) bg-(--admin-surface) px-3 text-sm text-(--admin-text)"
          >
            <option value="code">Code-based</option>
            <option value="automatic">Automatic</option>
          </select>
          <p className="text-xs text-(--admin-text-mute)">
            Automatic discounts apply when eligible, without requiring a coupon
            code.
          </p>
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
            Value
          </span>
          <input
            name="value"
            type="number"
            min="0"
            step="0.01"
            required
            placeholder="10"
            className="h-10 w-full rounded border border-(--admin-border-strong) bg-(--admin-surface) px-3 text-sm text-(--admin-text)"
          />
          <p className="text-xs text-(--admin-text-mute)">
            Percentage uses whole numbers (e.g. 10 = 10%). Fixed amount uses
            currency units (e.g. 15.00).
          </p>
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
            Minimum order amount (optional)
          </span>
          <input
            name="minimumOrderAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder="100.00"
            className="h-10 w-full rounded border border-(--admin-border-strong) bg-(--admin-surface) px-3 text-sm text-(--admin-text)"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
            Usage limit (optional)
          </span>
          <input
            name="usageLimit"
            type="number"
            min="1"
            step="1"
            placeholder="500"
            className="h-10 w-full rounded border border-(--admin-border-strong) bg-(--admin-surface) px-3 text-sm text-(--admin-text)"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
            Priority (automatic only)
          </span>
          <input
            name="priority"
            type="number"
            min="1"
            step="1"
            placeholder="10"
            className="h-10 w-full rounded border border-(--admin-border-strong) bg-(--admin-surface) px-3 text-sm text-(--admin-text)"
          />
          <p className="text-xs text-(--admin-text-mute)">
            Higher priority wins when two automatic discounts provide equal
            savings.
          </p>
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
            Starts at (optional)
          </span>
          <input
            name="startsAt"
            type="datetime-local"
            className="h-10 w-full rounded border border-(--admin-border-strong) bg-(--admin-surface) px-3 text-sm text-(--admin-text)"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs uppercase tracking-[0.08em] text-(--admin-text-mute)">
            Ends at (optional)
          </span>
          <input
            name="endsAt"
            type="datetime-local"
            className="h-10 w-full rounded border border-(--admin-border-strong) bg-(--admin-surface) px-3 text-sm text-(--admin-text)"
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-(--admin-text-soft) md:col-span-2">
          <input type="checkbox" name="isActive" defaultChecked />
          Activate immediately
        </label>

        <div className="md:col-span-2">
          <SubmitButton pendingLabel="Creating…">Create discount</SubmitButton>
        </div>
      </form>
    </section>
  );
}
