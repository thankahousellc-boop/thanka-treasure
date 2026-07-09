import { NextResponse } from "next/server";

import { enforceRateLimit } from "@/lib/rate-limit";
import { newsletterRepository } from "@/lib/repositories/newsletter-repository";
import { newsletterSchema } from "@/lib/utils/validators";

export async function POST(request: Request) {
  const limited = await enforceRateLimit("strict", request);
  if (limited) return limited;

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = newsletterSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid newsletter request payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    await newsletterRepository.subscribe({
      email: parsed.data.email,
      source: parsed.data.source,
    });
  } catch {
    return NextResponse.json({ success: true, persisted: false });
  }

  return NextResponse.json({ success: true, persisted: true });
}
