import { NextResponse } from "next/server";
import { z } from "zod";

import { blogRepository } from "@/lib/repositories/blog-repository";

const bodySchema = z.object({
  postId: z.string().uuid(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "postId must be a UUID." },
      { status: 400 },
    );
  }

  try {
    await blogRepository.incrementViews(parsed.data.postId);
  } catch {
    return NextResponse.json(
      { error: "Failed to record view." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
