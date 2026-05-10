import { and, asc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/db";
import { frames, productFrames } from "@/db/schema";
import { requireAdminSession } from "@/lib/repositories/authz";

export type FrameRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  priceDelta: number;
  imageBucket: string | null;
  imagePath: string | null;
  cutoutX: number;
  cutoutY: number;
  cutoutWidth: number;
  cutoutHeight: number;
  position: number;
  isActive: boolean;
};

export type ProductFrameRow = FrameRow & {
  isDefault: boolean;
};

type CreateFrameInput = {
  name: string;
  slug: string;
  description: string | null;
  priceDelta: number;
  imageBucket: string | null;
  imagePath: string | null;
  cutoutX: number;
  cutoutY: number;
  cutoutWidth: number;
  cutoutHeight: number;
  isActive: boolean;
};

type UpdateFrameInput = Partial<CreateFrameInput> & {
  position?: number;
};

const frameSelect = {
  id: frames.id,
  name: frames.name,
  slug: frames.slug,
  description: frames.description,
  priceDelta: frames.priceDelta,
  imageBucket: frames.imageBucket,
  imagePath: frames.imagePath,
  cutoutX: frames.cutoutX,
  cutoutY: frames.cutoutY,
  cutoutWidth: frames.cutoutWidth,
  cutoutHeight: frames.cutoutHeight,
  position: frames.position,
  isActive: frames.isActive,
} as const;

const productFrameSelect = {
  id: frames.id,
  name: frames.name,
  slug: frames.slug,
  description: frames.description,
  priceDelta: frames.priceDelta,
  imageBucket: frames.imageBucket,
  imagePath: frames.imagePath,
  cutoutX: frames.cutoutX,
  cutoutY: frames.cutoutY,
  cutoutWidth: frames.cutoutWidth,
  cutoutHeight: frames.cutoutHeight,
  position: productFrames.position,
  isActive: frames.isActive,
  isDefault: productFrames.isDefault,
} as const;

export const frameRepository = {
  async listAll(): Promise<FrameRow[]> {
    await requireAdminSession();
    const db = getDb();
    return db
      .select(frameSelect)
      .from(frames)
      .orderBy(asc(frames.position), asc(frames.name));
  },

  async listActive(): Promise<FrameRow[]> {
    const db = getDb();
    return db
      .select(frameSelect)
      .from(frames)
      .where(eq(frames.isActive, true))
      .orderBy(asc(frames.position), asc(frames.name));
  },

  async findById(id: string): Promise<FrameRow | null> {
    await requireAdminSession();
    const db = getDb();
    const [row] = await db.select().from(frames).where(eq(frames.id, id)).limit(1);
    return row ?? null;
  },

  async create(input: CreateFrameInput) {
    await requireAdminSession();
    const db = getDb();
    const [row] = await db
      .insert(frames)
      .values({
        name: input.name,
        slug: input.slug,
        description: input.description,
        priceDelta: input.priceDelta,
        imageBucket: input.imageBucket,
        imagePath: input.imagePath,
        cutoutX: input.cutoutX,
        cutoutY: input.cutoutY,
        cutoutWidth: input.cutoutWidth,
        cutoutHeight: input.cutoutHeight,
        isActive: input.isActive,
      })
      .returning({ id: frames.id });
    return row.id;
  },

  async update(id: string, input: UpdateFrameInput) {
    await requireAdminSession();
    const db = getDb();
    await db
      .update(frames)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(frames.id, id));
  },

  async delete(id: string) {
    await requireAdminSession();
    const db = getDb();
    await db.delete(frames).where(eq(frames.id, id));
  },

  async listForProductAdmin(productId: string): Promise<ProductFrameRow[]> {
    await requireAdminSession();
    const db = getDb();
    const rows = await db
      .select(productFrameSelect)
      .from(productFrames)
      .innerJoin(frames, eq(frames.id, productFrames.frameId))
      .where(eq(productFrames.productId, productId))
      .orderBy(asc(productFrames.position), asc(frames.name));
    return rows;
  },

  async listForProductPublic(productId: string): Promise<ProductFrameRow[]> {
    const db = getDb();
    const rows = await db
      .select(productFrameSelect)
      .from(productFrames)
      .innerJoin(frames, eq(frames.id, productFrames.frameId))
      .where(
        and(
          eq(productFrames.productId, productId),
          eq(frames.isActive, true),
        ),
      )
      .orderBy(asc(productFrames.position), asc(frames.name));
    return rows;
  },

  async setForProduct(
    productId: string,
    selections: { frameId: string; isDefault: boolean }[],
  ) {
    await requireAdminSession();
    const db = getDb();

    await db.delete(productFrames).where(eq(productFrames.productId, productId));

    if (selections.length === 0) {
      return;
    }

    const sanitized = selections.map((selection, index) => ({
      productId,
      frameId: selection.frameId,
      isDefault: selection.isDefault,
      position: index,
    }));

    let hasDefault = sanitized.some((row) => row.isDefault);
    if (!hasDefault && sanitized.length > 0) {
      sanitized[0].isDefault = true;
      hasDefault = true;
    }

    let defaultSeen = false;
    const finalRows = sanitized.map((row) => {
      if (row.isDefault) {
        if (defaultSeen) {
          return { ...row, isDefault: false };
        }
        defaultSeen = true;
      }
      return row;
    });

    await db.insert(productFrames).values(finalRows);
  },

  async findByIds(ids: string[]): Promise<FrameRow[]> {
    if (ids.length === 0) return [];
    const db = getDb();
    return db.select().from(frames).where(inArray(frames.id, ids));
  },
};
