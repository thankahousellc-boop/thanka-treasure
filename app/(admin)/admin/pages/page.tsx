import {
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  Icon,
} from "@/components/admin/ui";
import { FlashToast } from "@/components/admin/flash-toast";
import { pagesRepository } from "@/lib/repositories/pages-repository";

import { PagesTable } from "./pages-table";

async function loadPagesForAdmin() {
  try {
    return await pagesRepository.listForAdmin(250);
  } catch {
    return [];
  }
}

export default async function AdminPagesPage() {
  const pages = await loadPagesForAdmin();

  return (
    <section className="space-y-5">
      <FlashToast
        messages={{
          "page-created": "Page created.",
          "page-saved": "Page saved.",
        }}
      />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2
            className="admin-display text-2xl font-semibold"
            style={{ color: "var(--admin-text)" }}
          >
            Static pages
          </h2>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--admin-text-soft)" }}
          >
            Policy, about, and other long-form content.
          </p>
        </div>
        <ButtonLink href="/admin/pages/new">
          <Icon.Plus width={14} height={14} />
          <span>New page</span>
        </ButtonLink>
      </header>

      <Card>
        <CardHeader title="All pages" />
        {pages.length > 0 ? (
          <PagesTable rows={pages} />
        ) : (
          <CardBody>
            <p
              className="text-sm"
              style={{ color: "var(--admin-text-soft)" }}
            >
              No static pages yet. Create your first policy or about page.
            </p>
          </CardBody>
        )}
      </Card>
    </section>
  );
}
