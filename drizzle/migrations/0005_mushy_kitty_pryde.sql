CREATE TABLE IF NOT EXISTS "pending_checkout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_checkout_session_id" text NOT NULL,
	"cart_signature" text NOT NULL,
	"currency" text NOT NULL,
	"reserved_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pending_checkout_sessions_stripe_session_id_unique" ON "pending_checkout_sessions" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pending_checkout_sessions_status_idx" ON "pending_checkout_sessions" USING btree ("status");
