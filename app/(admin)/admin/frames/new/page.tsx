import { PageHeader } from "@/components/admin/ui";

import { createFrameAction } from "../actions";
import { FrameForm } from "../frame-form";

export const dynamic = "force-dynamic";

export default function NewFramePage() {
  return (
    <>
      <PageHeader
        title="New frame"
        description="Create a frame option that can later be assigned to products."
      />
      <FrameForm
        action={createFrameAction}
        submitLabel="Create frame"
        submittingLabel="Creating…"
        cancelHref="/admin/frames"
        values={{
          name: "",
          slug: "",
          description: "",
          priceDeltaDollars: "0",
          isActive: true,
          imageBucket: null,
          imagePath: null,
          cutoutX: 20,
          cutoutY: 20,
          cutoutWidth: 60,
          cutoutHeight: 60,
        }}
      />
    </>
  );
}
