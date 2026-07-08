ALTER TABLE "products" ADD COLUMN "category_id" uuid;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_category_id_idx" ON "products" USING btree ("category_id");--> statement-breakpoint
-- Backfill: link existing products to a category where the free-text
-- product_type already matches a category name or slug (the old implicit link).
UPDATE "products" AS p
SET "category_id" = c."id"
FROM "categories" AS c
WHERE p."category_id" IS NULL
  AND lower(coalesce(p."product_type", '')) IN (lower(c."name"), lower(c."slug"));