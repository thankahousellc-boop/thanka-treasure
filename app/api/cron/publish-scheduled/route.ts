import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { isCronAuthorized } from "@/lib/monitoring/cron-auth";
import { monitor } from "@/lib/monitoring/logger";
import { blogRepository } from "@/lib/repositories/blog-repository";

export const runtime = "nodejs";

async function runPublishJob() {
  const published = await blogRepository.publishDuePosts();

  if (published.length > 0) {
    revalidatePath("/blogs");
    for (const post of published) {
      revalidatePath(`/blogs/${post.slug}`);
    }
  }

  return NextResponse.json({
    ok: true,
    publishedCount: published.length,
    publishedSlugs: published.map((post) => post.slug),
  });
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    return await runPublishJob();
  } catch (error) {
    monitor.error("Scheduled blog publish job failed.", error, {
      source: "cron.publish-scheduled",
    });

    return NextResponse.json(
      { error: "Failed to publish scheduled posts." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
