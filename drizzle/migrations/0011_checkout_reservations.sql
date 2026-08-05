CREATE TABLE "checkout_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stripe_session_id" text NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_reservations" ADD CONSTRAINT "checkout_reservations_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checkout_reservations_variant_live_idx" ON "checkout_reservations" USING btree ("variant_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "checkout_reservations_session_idx" ON "checkout_reservations" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE VIEW "variant_availability" AS
SELECT
  i.variant_id,
  i.quantity,
  i.low_stock_threshold,
  coalesce(r.reserved, 0)::int AS reserved_quantity,
  (i.quantity - coalesce(r.reserved, 0))::int AS available_quantity
FROM inventory i
LEFT JOIN LATERAL (
  SELECT sum(cr.quantity) AS reserved
  FROM checkout_reservations cr
  WHERE cr.variant_id = i.variant_id
    AND cr.status = 'open'
    AND cr.expires_at > now()
) r ON true;--> statement-breakpoint
-- Carry live holds across so a checkout in flight during deploy is not lost.
INSERT INTO checkout_reservations (stripe_session_id, variant_id, quantity, status, expires_at)
SELECT
  p.stripe_checkout_session_id,
  (item ->> 'variantId')::uuid,
  (item ->> 'quantity')::int,
  'open',
  p.expires_at
FROM pending_checkout_sessions p
CROSS JOIN LATERAL jsonb_array_elements(p.reserved_items) AS item
WHERE p.status = 'open'
  AND p.expires_at > now()
  AND item ->> 'variantId' IS NOT NULL;--> statement-breakpoint
-- Clears reservations leaked by the old counter. Nothing writes this column
-- after this migration; it is dropped in a follow-up once no code reads it.
UPDATE inventory SET reserved_quantity = 0 WHERE reserved_quantity <> 0;