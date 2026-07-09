CREATE TABLE "attribute_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"type" text DEFAULT 'text' NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unit" text,
	"is_filterable" boolean DEFAULT false NOT NULL,
	"show_on_storefront" boolean DEFAULT true NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_attribute_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"definition_id" uuid NOT NULL,
	"value" text NOT NULL,
	"value_number" real,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_definition_id_attribute_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "attribute_definitions_key_unique" ON "attribute_definitions" USING btree ("key");--> statement-breakpoint
CREATE INDEX "attribute_definitions_position_idx" ON "attribute_definitions" USING btree ("position");--> statement-breakpoint
CREATE INDEX "product_attribute_values_product_id_idx" ON "product_attribute_values" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_attribute_values_definition_id_idx" ON "product_attribute_values" USING btree ("definition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_attribute_values_unique" ON "product_attribute_values" USING btree ("product_id","definition_id","value");