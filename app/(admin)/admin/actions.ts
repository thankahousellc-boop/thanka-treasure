"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function adminSignOutAction() {
  try {
    await auth.signOut();
  } catch {
    // Ignore — proceed to login regardless.
  }

  redirect("/auth/login?message=Signed%20out%20successfully.");
}
