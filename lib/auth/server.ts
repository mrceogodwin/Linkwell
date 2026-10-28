import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";

type NeonAuthInstance = ReturnType<typeof createNeonAuth>;
let cachedAuth: NeonAuthInstance | null = null;

/**
 * Return null when deployment configuration is incomplete or invalid instead
 * of crashing route initialization. Legacy auth remains available during the
 * staged rollout when Neon Auth cannot be initialized.
 */
export function getNeonAuth(): NeonAuthInstance | null {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

  if (!baseUrl || !cookieSecret || cookieSecret.length < 32) return null;
  if (cachedAuth) return cachedAuth;

  try {
    cachedAuth = createNeonAuth({
      baseUrl,
      cookies: {
        secret: cookieSecret,
        sessionDataTtl: 60,
      },
    });
    return cachedAuth;
  } catch {
    // Misconfigured values should fail closed; callers can return a controlled
    // unavailable response or continue through the legacy session path.
    return null;
  }
}
