import { getConfigs } from "@/services/config";
import { envConfigs } from "@/config";
import { getUuid } from "@/lib/hash";
import { db } from "@/core/db";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import * as schema from "@/config/db/schema";

// auth options
export const authOptions = {
  baseURL: envConfigs.auth_url,
  secret: envConfigs.auth_secret,
  database: drizzleAdapter(db(), {
    provider: getDatabaseProvider(envConfigs.database_provider),
    schema: schema,
  }),
  advanced: {
    database: {
      generateId: () => getUuid(),
    },
  },
};

export async function getSocialProviders() {
  // get configs from db
  const configs = await getConfigs();
  const providers: any = {};

  if (configs.google_client_id && configs.google_client_secret) {
    providers.google = {
      clientId: configs.google_client_id,
      clientSecret: configs.google_client_secret,
    };
  }

  if (configs.github_client_id && configs.github_client_secret) {
    providers.github = {
      clientId: configs.github_client_id,
      clientSecret: configs.github_client_secret,
    };
  }

  return providers;
}

export function getDatabaseProvider(
  provider: string
): "sqlite" | "pg" | "mysql" {
  switch (provider) {
    case "sqlite":
      return "sqlite";
    case "postgresql":
      return "pg";
    case "mysql":
      return "mysql";
    default:
      throw new Error(
        `Unsupported database provider for auth: ${envConfigs.database_provider}`
      );
  }
}
