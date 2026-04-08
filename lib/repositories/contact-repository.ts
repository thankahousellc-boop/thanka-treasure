import { and, desc, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { contactSubmissions } from "@/db/schema";
import { requireAdminSession } from "@/lib/repositories/authz";

type CreateContactSubmissionInput = {
  name: string;
  email: string;
  phone: string | null;
  message: string;
};

type ContactSubmissionStatus = "new" | "read" | "replied" | "archived";

export const contactRepository = {
  async countRecentByEmail(email: string, sinceIso: string) {
    const db = getDb();
    const since = new Date(sinceIso);

    const [result] = await db
      .select({ total: sql<number>`count(*)` })
      .from(contactSubmissions)
      .where(
        and(
          eq(contactSubmissions.email, email),
          gte(contactSubmissions.createdAt, since),
        ),
      );

    return Number(result?.total ?? 0);
  },

  async create(input: CreateContactSubmissionInput) {
    const db = getDb();

    await db.insert(contactSubmissions).values({
      name: input.name,
      email: input.email,
      phone: input.phone,
      message: input.message,
      status: "new",
      updatedAt: new Date(),
    });
  },

  async listForAdmin(limit = 100) {
    await requireAdminSession();

    const db = getDb();

    return db
      .select({
        id: contactSubmissions.id,
        name: contactSubmissions.name,
        email: contactSubmissions.email,
        phone: contactSubmissions.phone,
        message: contactSubmissions.message,
        status: contactSubmissions.status,
        adminNotes: contactSubmissions.adminNotes,
        repliedAt: contactSubmissions.repliedAt,
        createdAt: contactSubmissions.createdAt,
      })
      .from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(limit);
  },

  async updateStatus(id: string, status: ContactSubmissionStatus) {
    await requireAdminSession();

    const db = getDb();

    const updatedRows = await db
      .update(contactSubmissions)
      .set({
        status,
        repliedAt: status === "replied" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(contactSubmissions.id, id))
      .returning({ id: contactSubmissions.id });

    return updatedRows.length > 0;
  },

  async updateAdminNotes(id: string, notes: string | null) {
    await requireAdminSession();

    const db = getDb();

    const updatedRows = await db
      .update(contactSubmissions)
      .set({
        adminNotes: notes,
        updatedAt: new Date(),
      })
      .where(eq(contactSubmissions.id, id))
      .returning({ id: contactSubmissions.id });

    return updatedRows.length > 0;
  },

  async getAdminStats() {
    await requireAdminSession();

    const db = getDb();

    const [totalRow, newRow, repliedRow] = await Promise.all([
      db
        .select({ total: sql<number>`count(*)` })
        .from(contactSubmissions)
        .then((rows) => rows[0]),
      db
        .select({ total: sql<number>`count(*)` })
        .from(contactSubmissions)
        .where(eq(contactSubmissions.status, "new"))
        .then((rows) => rows[0]),
      db
        .select({ total: sql<number>`count(*)` })
        .from(contactSubmissions)
        .where(eq(contactSubmissions.status, "replied"))
        .then((rows) => rows[0]),
    ]);

    return {
      total: Number(totalRow?.total ?? 0),
      newCount: Number(newRow?.total ?? 0),
      repliedCount: Number(repliedRow?.total ?? 0),
    };
  },
};
