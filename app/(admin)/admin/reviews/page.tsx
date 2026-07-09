import {
  Card,
  CardBody,
  CardHeader,
  StatCard,
  SubmitButton,
  Icon,
} from "@/components/admin/ui";
import { FlashToast } from "@/components/admin/flash-toast";
import { reviewsRepository } from "@/lib/repositories/reviews-repository";

import { deleteReview, togglePublish, updateReview } from "./actions";
import { ReviewActions } from "./review-dialogs";
import { ReviewFields } from "./review-fields";

type ReviewRow = Awaited<
  ReturnType<typeof reviewsRepository.listForAdmin>
>[number];

async function loadData() {
  try {
    const [stats, reviews] = await Promise.all([
      reviewsRepository.getAdminStats(),
      reviewsRepository.listForAdmin(200),
    ]);
    return { stats, reviews };
  } catch {
    return {
      stats: { total: 0, publishedCount: 0 },
      reviews: [] as ReviewRow[],
    };
  }
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { stats, reviews } = await loadData();
  const params = await searchParams;
  const importedCount = Array.isArray(params.count)
    ? params.count[0]
    : params.count;

  return (
    <section className="space-y-5">
      <FlashToast
        messages={{
          "review-added": "Review added.",
          "review-updated": "Review updated.",
          "review-deleted": "Review deleted.",
          "import-done": "Reviews imported.",
          "import-empty": "No valid reviews found in that file.",
          invalid: "Author name and review text are required.",
        }}
      />

      {params.status === "import-done" && importedCount ? (
        <div
          className="rounded-md px-4 py-3 text-sm"
          style={{
            background: "rgba(31, 122, 63, 0.08)",
            border: "1px solid rgba(31, 122, 63, 0.25)",
            color: "#1f5a36",
          }}
        >
          Imported {importedCount} review
          {importedCount === "1" ? "" : "s"} from your file.
        </div>
      ) : null}

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="admin-display text-2xl font-semibold"
            style={{ color: "var(--admin-text)" }}
          >
            Customer reviews
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--admin-text-soft)" }}
          >
            Reviews shown on the homepage. Paste them from your Etsy shop.
          </p>
        </div>
        <ReviewActions />
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Published" value={stats.publishedCount} />
      </div>

      <Card>
        <CardHeader
          title="All reviews"
          description={`${reviews.length} entries.`}
        />
        {reviews.length === 0 ? (
          <CardBody>
            <p className="text-sm" style={{ color: "var(--admin-text-soft)" }}>
              No reviews yet. Use “Add review” or “Bulk import” above.
            </p>
          </CardBody>
        ) : (
          <CardBody>
            <div className="space-y-3">
              {reviews.map((review) => (
                <details
                  key={review.id}
                  className="rounded-md"
                  style={{
                    border: "1px solid var(--admin-border-strong)",
                    background: "var(--admin-surface)",
                  }}
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-medium"
                          style={{ color: "var(--admin-text)" }}
                        >
                          {review.authorName}
                        </span>
                        <span className="text-saffron text-sm">
                          {"★".repeat(Math.max(1, Math.min(5, review.rating)))}
                        </span>
                        {!review.isPublished ? (
                          <span
                            className="text-[10.5px] uppercase tracking-wide"
                            style={{ color: "var(--admin-text-mute)" }}
                          >
                            Hidden
                          </span>
                        ) : null}
                      </div>
                      <p
                        className="truncate text-sm"
                        style={{ color: "var(--admin-text-soft)" }}
                      >
                        {review.body}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <form action={togglePublish}>
                        <input type="hidden" name="id" value={review.id} />
                        <input
                          type="hidden"
                          name="isPublished"
                          value={review.isPublished ? "false" : "true"}
                        />
                        <SubmitButton variant="secondary" pendingLabel="…">
                          {review.isPublished ? (
                            <Icon.EyeOff width={13} height={13} />
                          ) : (
                            <Icon.Eye width={13} height={13} />
                          )}
                          <span>{review.isPublished ? "Hide" : "Show"}</span>
                        </SubmitButton>
                      </form>
                    </div>
                  </summary>

                  <div
                    className="space-y-3 px-4 pb-4 pt-1"
                    style={{ borderTop: "1px solid var(--admin-border)" }}
                  >
                    <form action={updateReview} className="space-y-3 pt-3">
                      <input type="hidden" name="id" value={review.id} />
                      <ReviewFields review={review} />
                      <div className="flex items-center gap-2">
                        <SubmitButton pendingLabel="Saving…">
                          <Icon.Check width={14} height={14} />
                          <span>Save changes</span>
                        </SubmitButton>
                      </div>
                    </form>
                    <form action={deleteReview}>
                      <input type="hidden" name="id" value={review.id} />
                      <SubmitButton variant="danger" pendingLabel="Deleting…">
                        <Icon.Trash width={14} height={14} />
                        <span>Delete review</span>
                      </SubmitButton>
                    </form>
                  </div>
                </details>
              ))}
            </div>
          </CardBody>
        )}
      </Card>
    </section>
  );
}
