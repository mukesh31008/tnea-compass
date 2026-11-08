import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

/**
 * The session is read once per request. Server components and server actions
 * both use this helper so a private page can never render another user's data.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireUser(nextPath = "/dashboard") {
  const session = await getSession();
  if (!session?.user) {
    redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  }
  return session;
}
