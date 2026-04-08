import { NextResponse } from "next/server";

import { contactRepository } from "@/lib/repositories/contact-repository";
import { contactSubmissionSchema } from "@/lib/utils/validators";

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = contactSubmissionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid contact request payload.",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const count = await contactRepository.countRecentByEmail(
      parsed.data.email,
      oneHourAgoIso,
    );

    if (count >= 3) {
      return NextResponse.json(
        {
          error:
            "Too many messages from this email in the last hour. Please try again later.",
        },
        { status: 429 },
      );
    }

    await contactRepository.create({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      message: parsed.data.message,
    });
  } catch {
    return NextResponse.json({ success: true, persisted: false });
  }

  return NextResponse.json({ success: true, persisted: true });
}
