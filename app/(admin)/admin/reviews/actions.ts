"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { reviewsRepository } from "@/lib/repositories/reviews-repository";

async function assertAdmin() {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

function toNonEmptyString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toRating(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5;
  return Math.max(1, Math.min(5, Math.round(parsed)));
}

function toSortOrder(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function toReviewedAt(value: FormDataEntryValue | null) {
  const str = toNonEmptyString(value);
  if (!str) return null;
  const date = new Date(str);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function createReview(formData: FormData) {
  await assertAdmin();

  const authorName = toNonEmptyString(formData.get("authorName"));
  const body = toNonEmptyString(formData.get("body"));

  if (!authorName || !body) {
    redirect("/admin/reviews?status=invalid");
  }

  await reviewsRepository.create({
    authorName,
    rating: toRating(formData.get("rating")),
    body,
    productTitle: toNonEmptyString(formData.get("productTitle")),
    reviewedAt: toReviewedAt(formData.get("reviewedAt")),
    sortOrder: toSortOrder(formData.get("sortOrder")),
    isPublished: formData.get("isPublished") === "on",
  });

  revalidatePath("/admin/reviews");
  revalidatePath("/");
  redirect("/admin/reviews?status=review-added");
}

export async function updateReview(formData: FormData) {
  await assertAdmin();

  const id = toNonEmptyString(formData.get("id"));
  const authorName = toNonEmptyString(formData.get("authorName"));
  const body = toNonEmptyString(formData.get("body"));

  if (!id || !authorName || !body) {
    redirect("/admin/reviews?status=invalid");
  }

  await reviewsRepository.update(id, {
    authorName,
    rating: toRating(formData.get("rating")),
    body,
    productTitle: toNonEmptyString(formData.get("productTitle")),
    reviewedAt: toReviewedAt(formData.get("reviewedAt")),
    sortOrder: toSortOrder(formData.get("sortOrder")),
    isPublished: formData.get("isPublished") === "on",
  });

  revalidatePath("/admin/reviews");
  revalidatePath("/");
  redirect("/admin/reviews?status=review-updated");
}

export async function togglePublish(formData: FormData) {
  await assertAdmin();

  const id = toNonEmptyString(formData.get("id"));
  if (!id) return;

  await reviewsRepository.setPublished(
    id,
    formData.get("isPublished") === "true",
  );

  revalidatePath("/admin/reviews");
  revalidatePath("/");
  redirect("/admin/reviews?status=review-updated");
}

/** RFC-4180-ish CSV parser: handles quoted fields, commas, and newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  const normalized = text.replace(/\r\n?/g, "\n");

  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];

    if (inQuotes) {
      if (char === '"') {
        if (normalized[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      field = "";
      row = [];
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

const HEADER_ALIASES: Record<string, string> = {
  author: "authorName",
  authorname: "authorName",
  name: "authorName",
  reviewer: "authorName",
  rating: "rating",
  stars: "rating",
  body: "body",
  review: "body",
  text: "body",
  comment: "body",
  message: "body",
  product: "productTitle",
  producttitle: "productTitle",
  item: "productTitle",
  date: "reviewedAt",
  reviewedat: "reviewedAt",
  reviewdate: "reviewedAt",
};

export async function bulkImportReviews(formData: FormData) {
  await assertAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin/reviews?status=import-empty");
  }

  const text = await (file as File).text();
  const rows = parseCsv(text);

  if (rows.length < 2) {
    redirect("/admin/reviews?status=import-empty");
  }

  const header = rows[0].map(
    (cell) => HEADER_ALIASES[cell.trim().toLowerCase().replace(/\s+/g, "")] ?? "",
  );

  const parsed = rows.slice(1).map((cols) => {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      if (key) record[key] = (cols[index] ?? "").trim();
    });
    return record;
  });

  const reviews = parsed
    .filter((r) => r.authorName && r.body)
    .map((r) => ({
      authorName: r.authorName,
      rating: toRating(r.rating ?? null),
      body: r.body,
      productTitle: r.productTitle ? r.productTitle : null,
      reviewedAt: toReviewedAt(r.reviewedAt ?? null),
      sortOrder: 0,
      isPublished: true,
    }));

  if (reviews.length === 0) {
    redirect("/admin/reviews?status=import-empty");
  }

  const inserted = await reviewsRepository.createMany(reviews);

  revalidatePath("/admin/reviews");
  revalidatePath("/");
  redirect(`/admin/reviews?status=import-done&count=${inserted}`);
}

export async function deleteReview(formData: FormData) {
  await assertAdmin();

  const id = toNonEmptyString(formData.get("id"));
  if (!id) return;

  await reviewsRepository.remove(id);

  revalidatePath("/admin/reviews");
  revalidatePath("/");
  redirect("/admin/reviews?status=review-deleted");
}
