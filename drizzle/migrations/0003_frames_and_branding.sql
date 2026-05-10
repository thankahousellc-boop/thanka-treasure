CREATE TABLE IF NOT EXISTS "frames" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"price_delta" integer DEFAULT 0 NOT NULL,
	"image_bucket" text,
	"image_path" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "frames_slug_unique" ON "frames" USING btree ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "frames_active_idx" ON "frames" USING btree ("is_active");--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_frames" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"frame_id" uuid NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_frames_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade,
	CONSTRAINT "product_frames_frame_id_fk" FOREIGN KEY ("frame_id") REFERENCES "frames"("id") ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_frames_unique" ON "product_frames" USING btree ("product_id","frame_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_frames_product_id_idx" ON "product_frames" USING btree ("product_id");--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "frame_snapshot" jsonb;
