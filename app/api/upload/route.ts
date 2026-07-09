import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { BUCKETS, storage } from "@/lib/storage";
import { uploadRequestSchema } from "@/lib/utils/validators";

const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const privateAssetMimeTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const imageSizeLimitBytes = 5 * 1024 * 1024;
const privateAssetSizeLimitBytes = 10 * 1024 * 1024;

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function sanitizeFileName(name: string) {
  const [basename, extension = ""] = name.split(/\.(?=[^\.]+$)/);
  const safeBase = basename
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  const safeExtension = extension
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 10);
  const normalizedBase = safeBase.length > 0 ? safeBase : "upload";

  return safeExtension ? `${normalizedBase}.${safeExtension}` : normalizedBase;
}

function resolveTarget(
  bucket: "product-images" | "blog-images" | "private-assets",
  target?: "product" | "blog-featured" | "blog-inline" | "private",
) {
  if (bucket === BUCKETS.PRODUCT_IMAGES) {
    return target ?? "product";
  }

  if (bucket === BUCKETS.BLOG_IMAGES) {
    return target ?? "blog-featured";
  }

  return "private";
}

function toPath(
  target: "product" | "blog-featured" | "blog-inline" | "private",
  entityId: string | undefined,
  fileName: string,
) {
  const timestamp = Date.now();

  switch (target) {
    case "product":
      return `products/${entityId ?? "unassigned"}/${timestamp}-${fileName}`;
    case "blog-featured":
      return `blog/${entityId ?? "draft"}/${timestamp}-${fileName}`;
    case "blog-inline":
      return `blog/content/${timestamp}-${fileName}`;
    case "private":
      return `private/${entityId ?? "misc"}/${timestamp}-${fileName}`;
    default:
      return `${timestamp}-${fileName}`;
  }
}

function isTargetCompatible(
  bucket: "product-images" | "blog-images" | "private-assets",
  target: "product" | "blog-featured" | "blog-inline" | "private",
) {
  if (bucket === BUCKETS.PRODUCT_IMAGES) {
    return target === "product";
  }

  if (bucket === BUCKETS.BLOG_IMAGES) {
    return target === "blog-featured" || target === "blog-inline";
  }

  return target === "private";
}

function getMimeRules(
  bucket: "product-images" | "blog-images" | "private-assets",
) {
  if (bucket === BUCKETS.PRIVATE_ASSETS) {
    return {
      allowedMimeTypes: privateAssetMimeTypes,
      sizeLimitBytes: privateAssetSizeLimitBytes,
    };
  }

  return {
    allowedMimeTypes: imageMimeTypes,
    sizeLimitBytes: imageSizeLimitBytes,
  };
}

export async function POST(request: Request) {
  // Uploads write to Supabase storage and are only ever triggered by admin
  // image/asset flows. Guard against anonymous abuse (disk-fill, spam uploads).
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const limited = await enforceRateLimit("strict", request);
  if (limited) return limited;

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }

  const parsed = uploadRequestSchema.safeParse({
    bucket: getString(formData, "bucket"),
    target: getString(formData, "target"),
    entityId: getString(formData, "entityId"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid upload metadata.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const bucket = parsed.data.bucket;
  const target = resolveTarget(bucket, parsed.data.target);

  if (!isTargetCompatible(bucket, target)) {
    return NextResponse.json(
      {
        error:
          "Invalid bucket/target combination. Use product target for product-images, blog targets for blog-images, and private target for private-assets.",
      },
      { status: 400 },
    );
  }

  const { allowedMimeTypes, sizeLimitBytes } = getMimeRules(bucket);

  if (!allowedMimeTypes.has(file.type)) {
    return NextResponse.json(
      {
        error:
          "Unsupported file type for this bucket. Check the allowed mime types for the selected bucket.",
      },
      { status: 400 },
    );
  }

  if (file.size > sizeLimitBytes) {
    return NextResponse.json(
      {
        error: `File exceeds ${Math.floor(sizeLimitBytes / (1024 * 1024))}MB limit.`,
      },
      { status: 400 },
    );
  }

  const fileName = sanitizeFileName(file.name || "upload");
  const path = toPath(target, parsed.data.entityId, fileName);
  try {
    const fileRef = await storage.upload(bucket, path, file, {
      contentType: file.type,
      upsert: false,
      cacheControl: "3600",
    });

    if (bucket !== BUCKETS.PRIVATE_ASSETS) {
      const publicUrl = storage.getPublicUrl(fileRef.bucket, fileRef.path);

      return NextResponse.json({
        success: true,
        ...fileRef,
        publicUrl,
        visibility: "public",
      });
    }

    try {
      const signedUrl = await storage.createSignedUrl(
        fileRef.bucket,
        fileRef.path,
        15 * 60,
      );

      return NextResponse.json({
        success: true,
        ...fileRef,
        signedUrl,
        visibility: "private",
      });
    } catch {
      return NextResponse.json({
        success: true,
        ...fileRef,
        visibility: "private",
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Upload failed.",
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
