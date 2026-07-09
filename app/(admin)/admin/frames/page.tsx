import Link from "next/link";
import Image from "next/image";

import { FlashToast } from "@/components/admin/flash-toast";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  Icon,
  PageHeader,
} from "@/components/admin/ui";
import { frameRepository } from "@/lib/repositories/frame-repository";
import { resolveUrl } from "@/lib/storage/resolve-url";
import { formatCurrency } from "@/lib/utils/formatters";

export const dynamic = "force-dynamic";

export default async function AdminFramesPage() {
  const frames = await frameRepository.listAll().catch(() => []);

  return (
    <>
      <FlashToast messages={{ deleted: "Frame deleted." }} />
      <PageHeader
        title="Frames"
        description="Frames are a global catalog. Each product opts into the frames it offers, and the customer picks one on the product page."
        actions={
          <ButtonLink href="/admin/frames/new">
            <Icon.Plus width={14} height={14} /> New frame
          </ButtonLink>
        }
      />

      {frames.length === 0 ? (
        <EmptyState
          title="No frames yet."
          description="Add your first frame so it can be assigned to products."
          action={
            <ButtonLink href="/admin/frames/new" size="sm">
              <Icon.Plus width={14} height={14} /> New frame
            </ButtonLink>
          }
          icon={<Icon.Frame width={24} height={24} />}
        />
      ) : (
        <Card>
          <ul className="divide-y divide-(--admin-border)">
            {frames.map((frame) => {
              const url =
                frame.imageBucket && frame.imagePath
                  ? resolveUrl({ bucket: frame.imageBucket, path: frame.imagePath })
                  : null;
              return (
                <li key={frame.id}>
                  <Link
                    href={`/admin/frames/${frame.id}`}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-(--admin-accent-soft)"
                  >
                    <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-md border border-(--admin-border) bg-(--admin-surface-2) text-(--admin-text-mute)">
                      {url ? (
                        <Image
                          src={url}
                          alt={frame.name}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <Icon.Frame width={18} height={18} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-(--admin-text)">
                        {frame.name}
                      </p>
                      <p className="truncate text-xs text-(--admin-text-mute)">
                        {frame.slug}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-medium text-(--admin-text)">
                        {frame.priceDelta > 0
                          ? `+${formatCurrency(frame.priceDelta)}`
                          : "Included"}
                      </p>
                      <Badge tone={frame.isActive ? "success" : "muted"}>
                        {frame.isActive ? "Active" : "Hidden"}
                      </Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
