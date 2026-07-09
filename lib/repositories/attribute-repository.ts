import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  attributeDefinitions,
  productAttributeValues,
  products,
} from "@/db/schema";
import { requireAdminSession } from "@/lib/repositories/authz";

export const ATTRIBUTE_TYPES = [
  "text",
  "number",
  "boolean",
  "select",
  "multi_select",
] as const;

export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

export type AttributeDefinition = typeof attributeDefinitions.$inferSelect;

export type AttributeDefinitionInput = {
  name: string;
  key: string;
  type: AttributeType;
  options: string[];
  unit: string | null;
  isFilterable: boolean;
  showOnStorefront: boolean;
  isRequired: boolean;
};

// One product's value(s) for a single definition. A multi_select carries many
// values; every other type carries exactly one (or zero to clear it).
export type ProductAttributeValueInput = {
  definitionId: string;
  values: string[];
};

// A definition paired with the value(s) a given product holds for it — the
// shape returned to the admin product form and the storefront spec list.
export type ResolvedProductAttribute = {
  definition: AttributeDefinition;
  values: string[];
};

export type AttributeFacet = {
  definition: AttributeDefinition;
  options: { value: string; count: number }[];
};

// The transaction handle drizzle passes to a `db.transaction(async (tx) => …)`
// callback — derived so callers can pass their `tx` without importing internals.
type DbTransaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

function normalizeOptions(options: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of options) {
    const value = raw.trim();
    if (value.length === 0 || seen.has(value)) {
      continue;
    }
    seen.add(value);
    result.push(value);
  }
  return result;
}

function toValueNumber(type: AttributeType, value: string) {
  if (type !== "number") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export const attributeRepository = {
  async listDefinitions() {
    const db = getDb();
    return db
      .select()
      .from(attributeDefinitions)
      .orderBy(
        asc(attributeDefinitions.position),
        asc(attributeDefinitions.name),
      );
  },

  async listFilterableDefinitions() {
    const db = getDb();
    return db
      .select()
      .from(attributeDefinitions)
      .where(eq(attributeDefinitions.isFilterable, true))
      .orderBy(
        asc(attributeDefinitions.position),
        asc(attributeDefinitions.name),
      );
  },

  async getDefinition(id: string) {
    const db = getDb();
    const [row] = await db
      .select()
      .from(attributeDefinitions)
      .where(eq(attributeDefinitions.id, id))
      .limit(1);
    return row ?? null;
  },

  async createDefinitionForAdmin(input: AttributeDefinitionInput) {
    await requireAdminSession();

    const db = getDb();

    const [maxRow] = await db
      .select({
        maxPosition: sql<number>`coalesce(max(${attributeDefinitions.position}), 0)`,
      })
      .from(attributeDefinitions);

    const nextPosition = Number(maxRow?.maxPosition ?? 0) + 1;

    const [created] = await db
      .insert(attributeDefinitions)
      .values({
        name: input.name,
        key: input.key,
        type: input.type,
        options: normalizeOptions(input.options),
        unit: input.unit,
        isFilterable: input.isFilterable,
        showOnStorefront: input.showOnStorefront,
        isRequired: input.isRequired,
        position: nextPosition,
        updatedAt: new Date(),
      })
      .returning({ id: attributeDefinitions.id });

    return created ?? null;
  },

  async updateDefinitionForAdmin(id: string, input: AttributeDefinitionInput) {
    await requireAdminSession();

    const db = getDb();

    const [updated] = await db
      .update(attributeDefinitions)
      .set({
        name: input.name,
        key: input.key,
        type: input.type,
        options: normalizeOptions(input.options),
        unit: input.unit,
        isFilterable: input.isFilterable,
        showOnStorefront: input.showOnStorefront,
        isRequired: input.isRequired,
        updatedAt: new Date(),
      })
      .where(eq(attributeDefinitions.id, id))
      .returning({ id: attributeDefinitions.id });

    return updated ?? null;
  },

  async deleteDefinitionForAdmin(id: string) {
    await requireAdminSession();

    const db = getDb();

    const deleted = await db
      .delete(attributeDefinitions)
      .where(eq(attributeDefinitions.id, id))
      .returning({ id: attributeDefinitions.id });

    return deleted.length > 0;
  },

  // Returns each product's attribute values grouped by definition, ordered by
  // the definition order. Used by the admin product form (all definitions) and
  // the storefront (storefrontOnly = true → only showOnStorefront definitions).
  async listValuesForProduct(
    productId: string,
    options?: { storefrontOnly?: boolean },
  ): Promise<ResolvedProductAttribute[]> {
    const db = getDb();

    const rows = await db
      .select({
        definition: attributeDefinitions,
        value: productAttributeValues.value,
        position: productAttributeValues.position,
      })
      .from(productAttributeValues)
      .innerJoin(
        attributeDefinitions,
        eq(attributeDefinitions.id, productAttributeValues.definitionId),
      )
      .where(
        and(
          eq(productAttributeValues.productId, productId),
          options?.storefrontOnly
            ? eq(attributeDefinitions.showOnStorefront, true)
            : undefined,
        ),
      )
      .orderBy(
        asc(attributeDefinitions.position),
        asc(productAttributeValues.position),
      );

    const grouped = new Map<string, ResolvedProductAttribute>();
    for (const row of rows) {
      const existing = grouped.get(row.definition.id);
      if (existing) {
        existing.values.push(row.value);
      } else {
        grouped.set(row.definition.id, {
          definition: row.definition,
          values: [row.value],
        });
      }
    }

    return [...grouped.values()];
  },

  // Replace a product's attribute values in one shot. Runs inside the caller's
  // transaction so it commits atomically with the product write.
  async setValuesForProduct(
    tx: DbTransaction,
    productId: string,
    values: ProductAttributeValueInput[],
  ) {
    await tx
      .delete(productAttributeValues)
      .where(eq(productAttributeValues.productId, productId));

    const definitionIds = values.map((entry) => entry.definitionId);
    if (definitionIds.length === 0) {
      return;
    }

    const definitions = await tx
      .select({
        id: attributeDefinitions.id,
        type: attributeDefinitions.type,
      })
      .from(attributeDefinitions)
      .where(inArray(attributeDefinitions.id, definitionIds));

    const typeById = new Map(definitions.map((d) => [d.id, d.type]));

    const rows: (typeof productAttributeValues.$inferInsert)[] = [];
    for (const entry of values) {
      const type = (typeById.get(entry.definitionId) ?? "text") as AttributeType;
      const seen = new Set<string>();
      let position = 0;
      for (const raw of entry.values) {
        const value = raw.trim();
        if (value.length === 0 || seen.has(value)) {
          continue;
        }
        seen.add(value);
        rows.push({
          productId,
          definitionId: entry.definitionId,
          value,
          valueNumber: toValueNumber(type, value),
          position,
          updatedAt: new Date(),
        });
        position += 1;
      }
    }

    if (rows.length > 0) {
      await tx.insert(productAttributeValues).values(rows);
    }
  },

  // Distinct filterable values with product counts across active products —
  // powers the storefront facet sidebar.
  async listFacets(): Promise<AttributeFacet[]> {
    const db = getDb();

    const definitions = await db
      .select()
      .from(attributeDefinitions)
      .where(eq(attributeDefinitions.isFilterable, true))
      .orderBy(
        asc(attributeDefinitions.position),
        asc(attributeDefinitions.name),
      );

    if (definitions.length === 0) {
      return [];
    }

    const counts = await db
      .select({
        definitionId: productAttributeValues.definitionId,
        value: productAttributeValues.value,
        count: sql<number>`count(distinct ${productAttributeValues.productId})`,
      })
      .from(productAttributeValues)
      .innerJoin(products, eq(products.id, productAttributeValues.productId))
      .where(
        and(
          inArray(
            productAttributeValues.definitionId,
            definitions.map((d) => d.id),
          ),
          eq(products.status, "active"),
          isNull(products.deletedAt),
        ),
      )
      .groupBy(productAttributeValues.definitionId, productAttributeValues.value)
      .orderBy(asc(productAttributeValues.value));

    const optionsByDefinition = new Map<
      string,
      { value: string; count: number }[]
    >();
    for (const row of counts) {
      const list = optionsByDefinition.get(row.definitionId) ?? [];
      list.push({ value: row.value, count: Number(row.count) });
      optionsByDefinition.set(row.definitionId, list);
    }

    return definitions
      .map((definition) => ({
        definition,
        options: optionsByDefinition.get(definition.id) ?? [],
      }))
      .filter((facet) => facet.options.length > 0);
  },

  // Like listFacets, but spans every non-deleted product regardless of status
  // (draft/active/archived) — powers the admin products filter bar so admins
  // can narrow the catalog by any filterable attribute value.
  async listFacetsForAdmin(): Promise<AttributeFacet[]> {
    await requireAdminSession();

    const db = getDb();

    const definitions = await db
      .select()
      .from(attributeDefinitions)
      .where(eq(attributeDefinitions.isFilterable, true))
      .orderBy(
        asc(attributeDefinitions.position),
        asc(attributeDefinitions.name),
      );

    if (definitions.length === 0) {
      return [];
    }

    const counts = await db
      .select({
        definitionId: productAttributeValues.definitionId,
        value: productAttributeValues.value,
        count: sql<number>`count(distinct ${productAttributeValues.productId})`,
      })
      .from(productAttributeValues)
      .innerJoin(products, eq(products.id, productAttributeValues.productId))
      .where(
        and(
          inArray(
            productAttributeValues.definitionId,
            definitions.map((d) => d.id),
          ),
          isNull(products.deletedAt),
        ),
      )
      .groupBy(productAttributeValues.definitionId, productAttributeValues.value)
      .orderBy(asc(productAttributeValues.value));

    const optionsByDefinition = new Map<
      string,
      { value: string; count: number }[]
    >();
    for (const row of counts) {
      const list = optionsByDefinition.get(row.definitionId) ?? [];
      list.push({ value: row.value, count: Number(row.count) });
      optionsByDefinition.set(row.definitionId, list);
    }

    return definitions
      .map((definition) => ({
        definition,
        options: optionsByDefinition.get(definition.id) ?? [],
      }))
      .filter((facet) => facet.options.length > 0);
  },
};
