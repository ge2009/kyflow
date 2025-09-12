import { user } from "@/config/db/schema";
import { db } from "@/core/db";
import { desc } from "drizzle-orm";
import { headers } from "next/headers";
import { auth } from "@/core/auth";

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export async function getUsers({
  page = 1,
  limit = 30,
}: {
  page?: number;
  limit?: number;
} = {}): Promise<User[]> {
  const result = await db()
    .select()
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(limit)
    .offset((page - 1) * limit);

  return result;
}

export async function getUserInfo() {
  const signUser = await getSignUser();

  return signUser;
}

export async function getSignUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user;
}
