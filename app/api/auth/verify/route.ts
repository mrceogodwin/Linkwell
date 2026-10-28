import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

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
       SELECT user_id FROM session_created LIMIT 1`,
      [hash(token), hash(sessionToken)]
    );
    if (!rows.length) return NextResponse.redirect(new URL("/sign-in?error=invalid-link", url.origin));

    const response = NextResponse.redirect(new URL("/dashboard", url.origin));
    response.cookies.set("linkwell_session", sessionToken, {
      httpOnly: true, secure: url.protocol === "https:", sameSite: "lax",
      path: "/", maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/sign-in?error=service-unavailable", url.origin));
  }
}
