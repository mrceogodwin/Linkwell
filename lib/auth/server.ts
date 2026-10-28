import "server-only";

import { createNeonAuth } from "@neondatabase/auth/next/server";

type NeonAuthInstance = ReturnType<typeof createNeonAuth>;
let cachedAuth: NeonAuthInstance | null = null;

/**
 * Return null when deployment configuration is incomplete instead of throwing
 * during Next.js module evaluation. Routes can then return a controlled 503,
 * while legacy application pages can continue to load during staged rollout.
 */
export function getNeonAuth(): NeonAuthInstance | null {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

  if (!baseUrl || !cookieSecret || cookieSecret.length < 32) return null;
  if (!cachedAuth) {
    cachedAuth = createNeonAuth({
      baseUrl,
      cookies: {
        secret: cookieSecret,
        sessionDataTtl: 60,
      },
    });
  }
  return cachedAuth;
}
