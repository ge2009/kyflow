import { taxonomy } from "@/config/db/schema";
import { db } from "@/core/db";
import { and, count, desc, eq } from "drizzle-orm";

export type Taxonomy = typeof taxonomy.$inferSelect;
export type NewTaxonomy = typeof taxonomy.$inferInsert;

export enum TaxonomyType {
  CATEGORY = "category",
  TAG = "tag",
}

export enum TaxonomyStatus {
  PUBLISHED = "published", // published and visible to the public
  PENDING = "pending", // pending review by admin
  DRAFT = "draft", // draft and not visible to the public
  ARCHIVED = "archived", // archived means deleted
}

export async function addTaxonomy(data: NewTaxonomy) {
  const [result] = await db().insert(taxonomy).values(data).returning();

  return result;
}

export async function getTaxonomies({
  type,
  status,
  page = 1,
  limit = 30,
}: {
  type?: TaxonomyType;
  status?: TaxonomyStatus;
  page?: number;
  limit?: number;
} = {}): Promise<Taxonomy[]> {
  const result = await db()
    .select()
    .from(taxonomy)
    .where(
      and(
        type ? eq(taxonomy.type, type) : undefined,
        status ? eq(taxonomy.status, status) : undefined
      )
    )
    .orderBy(desc(taxonomy.createdAt), desc(taxonomy.updatedAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return result;
}

export async function getTaxonomiesCount({
  type,
  status,
}: {
  type?: TaxonomyType;
  status?: TaxonomyStatus;
} = {}): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(taxonomy)
    .where(
      and(
        type ? eq(taxonomy.type, type) : undefined,
        status ? eq(taxonomy.status, status) : undefined
      )
    )
    .limit(1);

  return result?.count || 0;
}

export async function getCategories({
  page = 1,
  limit = 30,
}: {
  page?: number;
  limit?: number;
} = {}): Promise<Taxonomy[]> {
  return getTaxonomies({
    type: TaxonomyType.CATEGORY,
    status: TaxonomyStatus.PUBLISHED,
    page,
    limit,
  });
}

export async function getCategoriesCount(): Promise<number> {
  return getTaxonomiesCount({
    type: TaxonomyType.CATEGORY,
    status: TaxonomyStatus.PUBLISHED,
  });
}
