import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";

const fallbackSecret =
  "tnea-compass-local-development-secret-do-not-use-in-production";

const siteUrl =
  process.env.BETTER_AUTH_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000";

/**
 * Email/password authentication only. No social provider is enabled, so the
 * account record stays small and there is no third-party data sharing.
 *
 * The secret must be set in production. The local fallback exists so a fresh
 * checkout can run `npm run dev` without an .env file; deployment checks in
 * the README require a real secret before going live.
 */
export const auth = betterAuth({
  appName: "TNEA Compass",
  baseURL: siteUrl,
  secret: process.env.BETTER_AUTH_SECRET ?? fallbackSecret,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  trustedOrigins:
    process.env.NODE_ENV === "production"
      ? [siteUrl]
      : [
          siteUrl,
          "http://localhost:3000",
          "http://localhost:3001",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:3001",
        ],
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
