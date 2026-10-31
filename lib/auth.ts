import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";

export type LinkwellUser = {
  id: string;
  email: string;
  display_name: string;
  role: "talent" | "employer" | "admin";
  email_verified_at: string | null;
  disabled_at: string | null;
};

export async function getCurrentUser(): Promise<LinkwellUser | null> {
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

  // Employer authorization must also depend on the company's current
  // verification state. This protects every employer API route, including
  // applicant data endpoints, when verification is revoked after sign-in.
  if (user.role === "employer") {
    try {
      const rows = await getDb().query(
        "SELECT 1 FROM employer_profiles WHERE user_id = $1::uuid AND verified_at IS NOT NULL LIMIT 1",
        [user.id]
      );
      if (!rows.length) return null;
    } catch {
      return null;
    }
  }

  return user;
}
