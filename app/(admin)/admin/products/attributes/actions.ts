"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import slugify from "slugify";

import { TAXONOMY_FACETS_TAG } from "@/lib/catalog-taxonomy";
import { auth } from "@/lib/auth";
import {
  ATTRIBUTE_TYPES,
  type AttributeDefinitionInput,
  type AttributeType,
  attributeRepository,
} from "@/lib/repositories/attribute-repository";

async function assertAdmin() {
  const session = await auth.getSession();
  if (session.user?.role !== "admin") {
    throw new Error("Forbidden");
  }
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) != null;
}

function toAttributeType(raw: string): AttributeType {
  return (ATTRIBUTE_TYPES as readonly string[]).includes(raw)
    ? (raw as AttributeType)
    : "text";
}

function parseOptions(raw: string) {
  return raw
    .split(/[\n,]/)
    .map((option) => option.trim())
    .filter((option) => option.length > 0)
    .slice(0, 100);
}

function parseAttributeForm(formData: FormData): AttributeDefinitionInput {
  const name = getString(formData, "name");
  if (name.length < 1 || name.length > 120) {
    throw new Error("Attribute name is required.");
  }

  const keyInput = getString(formData, "key");
  const key = slugify(keyInput || name, { lower: true, strict: true });
  if (!key) {
    throw new Error("Unable to generate a valid attribute key.");
  }

  const type = toAttributeType(getString(formData, "type"));
  const options =
    type === "select" || type === "multi_select"
      ? parseOptions(getString(formData, "options"))
      : [];

  if ((type === "select" || type === "multi_select") && options.length === 0) {
    throw new Error("Select attributes require at least one option.");
  }

  const unit = getString(formData, "unit");

  return {
    name,
    key,
    type,
    options,
    unit: unit.length > 0 ? unit : null,
    isFilterable: getBoolean(formData, "isFilterable"),
    showOnStorefront: getBoolean(formData, "showOnStorefront"),
    isRequired: getBoolean(formData, "isRequired"),
  };
}

function revalidateAttributePaths() {
  revalidatePath("/admin/products/attributes");
  // New/changed definitions affect every product form and storefront facets.
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidateTag(TAXONOMY_FACETS_TAG, "max");
}

export async function createAttributeAction(formData: FormData) {
  await assertAdmin();

  const payload = parseAttributeForm(formData);
  await attributeRepository.createDefinitionForAdmin(payload);

  revalidateAttributePaths();
  redirect("/admin/products/attributes?status=created");
}

export async function updateAttributeAction(id: string, formData: FormData) {
  await assertAdmin();

  const payload = parseAttributeForm(formData);
  const updated = await attributeRepository.updateDefinitionForAdmin(
    id,
    payload,
  );

  if (!updated) {
    throw new Error("Attribute not found.");
  }

  revalidateAttributePaths();
  redirect("/admin/products/attributes?status=saved");
}

export async function deleteAttributeAction(formData: FormData) {
  await assertAdmin();

  const id = getString(formData, "id");
  if (!id) {
    return;
  }

  await attributeRepository.deleteDefinitionForAdmin(id);

  revalidateAttributePaths();
  redirect("/admin/products/attributes?status=deleted");
}
