"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { contactRepository } from "@/lib/repositories/contact-repository";

type ContactSubmissionStatus = "new" | "read" | "replied" | "archived";

function toStatus(
  value: FormDataEntryValue | null,
): ContactSubmissionStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  if (
    value === "new" ||
    value === "read" ||
    value === "replied" ||
    value === "archived"
  ) {
    return value;
  }

  return null;
}

async function assertAdmin() {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

export async function updateContactSubmissionStatus(formData: FormData) {
  await assertAdmin();

  const id = formData.get("id");
  const status = toStatus(formData.get("status"));

  if (typeof id !== "string" || !status) {
    return;
  }

  await contactRepository.updateStatus(id, status);
  revalidatePath("/admin/messages");
  redirect("/admin/messages?flash=message-updated");
}

export async function updateContactSubmissionNotes(formData: FormData) {
  await assertAdmin();

  const id = formData.get("id");
  const notes = formData.get("notes");

  if (typeof id !== "string") {
    return;
  }

  const normalizedNotes =
    typeof notes === "string" && notes.trim().length > 0 ? notes.trim() : null;

  await contactRepository.updateAdminNotes(id, normalizedNotes);
  revalidatePath("/admin/messages");
  redirect("/admin/messages?flash=notes-saved");
}
