import { createStaticPageAction } from "../actions";
import { StaticPageForm } from "../static-page-form";

export default function AdminNewStaticPage() {
  return (
    <StaticPageForm
      title="Create static page"
      description="Create pages like About, Shipping Policy, or Privacy Policy."
      submitLabel="Create page"
      action={createStaticPageAction}
      showTemplates
      values={{
        title: "",
        slug: "",
        content: "",
        status: "draft",
        metaTitle: "",
        metaDescription: "",
      }}
    />
  );
}
