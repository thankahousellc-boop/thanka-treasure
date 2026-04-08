import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const contactSubmissions = pgTable(
  "contact_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    message: text("message").notNull(),
    status: text("status").notNull().default("new"),
    adminNotes: text("admin_notes"),
    repliedAt: timestamp("replied_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("contact_submissions_email_created_at_idx").on(
      table.email,
      table.createdAt,
    ),
  ],
);

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    status: text("status").notNull().default("active"),
    source: text("source").notNull().default("footer"),
    subscribedAt: timestamp("subscribed_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("newsletter_subscribers_email_idx").on(table.email)],
);
