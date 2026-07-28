import { Field, Input, Select, Textarea } from "@/components/admin/ui";

export type ReviewFieldValues = {
  authorName: string;
  rating: number;
  body: string;
  productTitle: string | null;
  reviewedAt: Date | null;
  sortOrder: number;
  isPublished: boolean;
};

export function toDateInputValue(date: Date | null) {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

/**
 * Field group shared by the "add" modal and the inline edit form. Plain
 * component (no client hooks) so it renders in both server and client trees.
 */
export function ReviewFields({ review }: { review?: ReviewFieldValues }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Author name">
          <Input
            name="authorName"
            required
            defaultValue={review?.authorName ?? ""}
            placeholder="e.g. Sarah M."
          />
        </Field>
        <Field label="Rating">
          <Select name="rating" defaultValue={String(review?.rating ?? 5)}>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star{n === 1 ? "" : "s"}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Review text">
        <Textarea
          name="body"
          required
          rows={4}
          defaultValue={review?.body ?? ""}
          placeholder="Paste the review text from Etsy."
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Product (optional)">
          <Input
            name="productTitle"
            defaultValue={review?.productTitle ?? ""}
            placeholder="Green Tara thanka"
          />
        </Field>
        <Field label="Review date (optional)">
          <Input
            type="date"
            name="reviewedAt"
            defaultValue={toDateInputValue(review?.reviewedAt ?? null)}
          />
        </Field>
        <Field label="Sort order" hint="Lower shows first">
          <Input
            type="number"
            name="sortOrder"
            defaultValue={String(review?.sortOrder ?? 0)}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isPublished"
          defaultChecked={review ? review.isPublished : true}
        />
        <span style={{ color: "var(--admin-text-soft)" }}>
          Published (show on storefront)
        </span>
      </label>
    </div>
  );
}
