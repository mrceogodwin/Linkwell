import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { getNeonAuth } from "@/lib/auth/server";

export type LinkwellUser = {
  id: string;
  email: string;
  display_name: string;
  role: "talent" | "employer" | "admin";
  email_verified_at: string | null;
  disabled_at: string | null;
};

/**
 * Resolve a managed Neon Auth session to an existing Linkwell profile.
 * We intentionally do not auto-create profiles or accept roles from Neon
 * user metadata here: role/profile creation needs the onboarding form flow.
 * Legacy sessions remain supported during the staged migration.
 */
export async function getCurrentUser(): Promise<LinkwellUser | null> {
  try {
    const neonAuth = getNeonAuth();
    if (neonAuth) {
      const authResult = await neonAuth.getSession();
    const authUser = authResult?.user as
      | { email?: unknown; emailVerified?: unknown }
      | undefined;
    const email =
      typeof authUser?.email === "string" ? authUser.email.trim().toLowerCase() : "";

    // Do not map an unverified Neon identity to an application account.
    if (email && authUser?.emailVerified === true && process.env.DATABASE_URL) {
      const sql = getDb();
      const rows = await sql.query(
        `SELECT id, email, display_name, role, email_verified_at, disabled_at
         FROM users
         WHERE lower(email) = $1
           AND email_verified_at IS NOT NULL
           AND disabled_at IS NULL
         LIMIT 1`,
        [email]
      );
      if (rows.length) return rows[0] as LinkwellUser;
      }
    }
  } catch {
    // Continue to the legacy cookie path during migration. This keeps the
    // existing sign-in flow working if Neon Auth is unavailable or not signed in.
  }

  const token = (await cookies()).get("linkwell_session")?.value;
  if (!token || token.length < 32 || token.length > 256 || !process.env.DATABASE_URL) return null;
  try {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const sql = getDb();
    const rows = await sql.query(
      `SELECT u.id, u.email, u.display_name, u.role, u.email_verified_at, u.disabled_at
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now() AND u.disabled_at IS NULL
       LIMIT 1`,
      [tokenHash]
    );
    return (rows[0] as LinkwellUser | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function requireRole(roles: LinkwellUser["role"][]) {
  const user = await getCurrentUser();
  if (!user || !user.email_verified_at || !roles.includes(user.role)) return null;
  return user;
}
