"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Same-origin client. Better Auth reads the session cookie set by the server
 * handler, so no token is stored in localStorage.
 */
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
