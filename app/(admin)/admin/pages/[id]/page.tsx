import { notFound } from "next/navigation";

import { FlashToast } from "@/components/admin/flash-toast";
import { pagesRepository } from "@/lib/repositories/pages-repository";

import { updateStaticPageAction } from "../actions";
import { StaticPageForm } from "../static-page-form";

type AdminEditStaticPageProps = {
  params: Promise<{ id: string }>;
};

function toAdminStatus(value: string): "draft" | "published" | "active" {
  if (value === "published" || value === "active") {
    return value;
  }

  return "draft";
}

export default async function AdminEditStaticPage({
  params,
}: AdminEditStaticPageProps) {
  const { id } = await params;
  const page = await pagesRepository.findByIdForAdmin(id);

  if (!page) {
    notFound();
  }

  const action = updateStaticPageAction.bind(null, id);

  return (
    <>
      <FlashToast
        messages={{
          "page-created": "Page created.",
          "page-saved": "Page saved.",
        }}
      />
      <StaticPageForm
        title={`Edit static page: ${page.title}`}
        description="Update content, publication status, and metadata."
        submitLabel="Save changes"
        action={action}
        values={{
          title: page.title,
          slug: page.slug,
          content: page.content ?? "",
          status: toAdminStatus(page.status),
          metaTitle: page.metaTitle ?? "",
          metaDescription: page.metaDescription ?? "",
        }}
      />
    </>
  );
}
