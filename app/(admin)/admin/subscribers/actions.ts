"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { sendNewsletterCampaign } from "@/lib/email/newsletter";
import { newsletterRepository } from "@/lib/repositories/newsletter-repository";

function toSubscriberStatus(value: FormDataEntryValue | null) {
  if (value === "active" || value === "unsubscribed") {
    return value;
  }

  return null;
}

function toNonEmptyString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function assertAdmin() {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

export async function addManualSubscriber(formData: FormData) {
  await assertAdmin();

  const email = formData.get("email");
  if (typeof email !== "string") {
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return;
  }

  await newsletterRepository.subscribe({
    email: normalizedEmail,
    source: "manual",
  });

  revalidatePath("/admin/subscribers");
  redirect("/admin/subscribers?status=subscriber-added");
}

export async function updateSubscriberStatus(formData: FormData) {
  await assertAdmin();

  const email = formData.get("email");
  const status = toSubscriberStatus(formData.get("status"));

  if (typeof email !== "string" || !status) {
    return;
  }

  await newsletterRepository.setStatusByEmail(
    email.trim().toLowerCase(),
    status,
  );
  revalidatePath("/admin/subscribers");
  redirect("/admin/subscribers?status=subscriber-updated");
}

export async function sendNewsletterCampaignAction(formData: FormData) {
  await assertAdmin();

  const subject = toNonEmptyString(formData.get("subject"));
  const body = toNonEmptyString(formData.get("body"));
  const heading =
    toNonEmptyString(formData.get("heading")) ?? subject ?? "Newsletter update";
  const ctaLabel = toNonEmptyString(formData.get("ctaLabel"));
  const ctaUrl = toNonEmptyString(formData.get("ctaUrl"));

  if (!subject || !body) {
    redirect("/admin/subscribers?campaign=invalid");
  }

  if ((ctaLabel && !ctaUrl) || (!ctaLabel && ctaUrl)) {
    redirect("/admin/subscribers?campaign=invalid_cta");
  }

  const recipients = await newsletterRepository.listActive(10_000);
  const summary = await sendNewsletterCampaign({
    subject,
    heading,
    body,
    ctaLabel,
    ctaUrl,
    recipients,
  });

  const params = new URLSearchParams({
    campaign: "sent",
    attempted: String(summary.attempted),
    sent: String(summary.sent),
    failed: String(summary.failed),
    skipped: String(summary.skipped),
  });

  revalidatePath("/admin/subscribers");
  redirect(`/admin/subscribers?${params.toString()}`);
}
