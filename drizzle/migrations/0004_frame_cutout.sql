ALTER TABLE "frames" ADD COLUMN IF NOT EXISTS "cutout_x" real DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "frames" ADD COLUMN IF NOT EXISTS "cutout_y" real DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "frames" ADD COLUMN IF NOT EXISTS "cutout_width" real DEFAULT 60 NOT NULL;--> statement-breakpoint
ALTER TABLE "frames" ADD COLUMN IF NOT EXISTS "cutout_height" real DEFAULT 60 NOT NULL;
