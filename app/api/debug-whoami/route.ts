import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth.getSession();
  return NextResponse.json({
    isAuthenticated: Boolean(session.user),
    user: session.user,
    expiresAt: session.expiresAt,
  });
}
