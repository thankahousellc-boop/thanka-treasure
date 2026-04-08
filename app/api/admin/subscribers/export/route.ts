import { auth } from "@/lib/auth";
import { newsletterRepository } from "@/lib/repositories/newsletter-repository";

function escapeCsvValue(value: string) {
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export async function GET() {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    return new Response("Unauthorized", { status: 401 });
  }

  const subscribers = await newsletterRepository.listForExport();
  const header = [
    "email",
    "status",
    "source",
    "subscribed_at",
    "unsubscribed_at",
  ];

  const rows = subscribers.map((subscriber) => [
    subscriber.email,
    subscriber.status,
    subscriber.source,
    subscriber.subscribedAt.toISOString(),
    subscriber.unsubscribedAt ? subscriber.unsubscribedAt.toISOString() : "",
  ]);

  const csv = [header, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(String(value))).join(","))
    .join("\n");

  const datePart = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=\"newsletter-subscribers-${datePart}.csv\"`,
      "Cache-Control": "no-store",
    },
  });
}
