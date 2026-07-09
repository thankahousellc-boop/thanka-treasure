ALTER TABLE "orders" ADD COLUMN "source" text DEFAULT 'online' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method" text;