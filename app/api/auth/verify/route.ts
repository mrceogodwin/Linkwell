import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

function safeInternalPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) {
    return null;
  }
  try {
    const parsed = new URL(value, "https://linkwell.invalid");
    if (parsed.origin !== "https://linkwell.invalid") return null;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  if (token.length < 32 || token.length > 256 || !process.env.DATABASE_URL) {
    return NextResponse.redirect(new URL("/sign-in?error=invalid-link", url.origin));
  }

  const sessionToken = randomBytes(32).toString("base64url");
  try {
    const sql = getDb();
    const rows = await sql.query(
      `WITH candidate AS (
         SELECT t.id, t.user_id, t.purpose
         FROM auth_email_tokens t
         JOIN users u ON u.id = t.user_id
         WHERE t.token_hash = $1 AND t.expires_at > now()
           AND u.disabled_at IS NULL
           AND (t.purpose = 'verify_email' OR u.email_verified_at IS NOT NULL)
         FOR UPDATE OF t
       ), consumed AS (
         DELETE FROM auth_email_tokens t USING candidate c
         WHERE t.id = c.id
         RETURNING c.user_id, c.purpose
       ), verified AS (
         UPDATE users u
         SET email_verified_at = COALESCE(u.email_verified_at, now()), updated_at = now()
         FROM consumed c
         WHERE u.id = c.user_id AND c.purpose = 'verify_email' AND u.disabled_at IS NULL
         RETURNING u.id
       ), eligible AS (
         SELECT id AS user_id FROM verified
         UNION ALL
         SELECT u.id FROM consumed c JOIN users u ON u.id = c.user_id
         WHERE c.purpose = 'sign_in' AND u.email_verified_at IS NOT NULL AND u.disabled_at IS NULL
       ), session_created AS (
         INSERT INTO auth_sessions (user_id, token_hash, expires_at)
         SELECT user_id, $2, now() + interval '30 days' FROM eligible
         RETURNING user_id
       )
       SELECT s.user_id, u.role, c.purpose
       FROM session_created s
       JOIN users u ON u.id = s.user_id
       JOIN consumed c ON c.user_id = s.user_id
       LIMIT 1`,
      [hash(token), hash(sessionToken)]
    );
    if (!rows.length) return NextResponse.redirect(new URL("/sign-in?error=invalid-link", url.origin));

    const verifiedUser = rows[0] as { user_id: string; role: "talent" | "employer" | "admin"; purpose: "verify_email" | "sign_in" };
    const defaultDestination = verifiedUser.role === "employer" ? "/dashboard/company" : verifiedUser.role === "admin" ? "/admin" : "/dashboard";
    const requestedNext = safeInternalPath(url.searchParams.get("next"));
    const destination = verifiedUser.purpose === "sign_in" && requestedNext ? requestedNext : defaultDestination;
    const response = NextResponse.redirect(new URL(destination, url.origin));
    response.cookies.set("linkwell_session", sessionToken, {
      httpOnly: true, secure: url.protocol === "https:", sameSite: "lax",
      path: "/", maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/sign-in?error=service-unavailable", url.origin));
  }
}
