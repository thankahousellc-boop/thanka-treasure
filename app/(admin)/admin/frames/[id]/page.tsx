import { notFound } from "next/navigation";

import { FlashToast } from "@/components/admin/flash-toast";
import { PageHeader } from "@/components/admin/ui";
import { frameRepository } from "@/lib/repositories/frame-repository";

import { deleteFrameAction, updateFrameAction } from "../actions";
import { FrameForm } from "../frame-form";

export const dynamic = "force-dynamic";

type EditFramePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditFramePage({ params }: EditFramePageProps) {
  const { id } = await params;
  const frame = await frameRepository.findById(id).catch(() => null);
  if (!frame) notFound();

  return (
    <>
      <FlashToast
        messages={{
          created: "Frame created.",
          saved: "Frame saved.",
        }}
      />
      <PageHeader title={frame.name} description={`Frame · ${frame.slug}`} />
      <FrameForm
        action={updateFrameAction}
        deleteAction={deleteFrameAction}
        frameId={id}
        submitLabel="Save changes"
        submittingLabel="Saving…"
        cancelHref="/admin/frames"
        values={{
          name: frame.name,
          slug: frame.slug,
          description: frame.description ?? "",
          priceDeltaDollars: (frame.priceDelta / 100).toFixed(2),
          isActive: frame.isActive,
          imageBucket: frame.imageBucket,
          imagePath: frame.imagePath,
          cutoutX: frame.cutoutX,
          cutoutY: frame.cutoutY,
          cutoutWidth: frame.cutoutWidth,
          cutoutHeight: frame.cutoutHeight,
        }}
      />
    </>
  );
}
