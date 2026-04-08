import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  role: text("role").notNull().default("customer"),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
