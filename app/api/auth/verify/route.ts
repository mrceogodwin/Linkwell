import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (token.length < 32 || token.length > 256 || !process.env.DATABASE_URL) {
    return NextResponse.redirect(new URL("/sign-in?error=invalid-link", request.url));
  }

  const sessionToken = randomBytes(32).toString("base64url");
  try {
    const sql = getDb();
    const rows = await sql.query(
      `WITH consumed AS (
         DELETE FROM auth_email_tokens
         WHERE token_hash = $1 AND expires_at > now()
           AND (purpose = 'verify_email' OR EXISTS (
             SELECT 1 FROM users u WHERE u.id = auth_email_tokens.user_id AND u.email_verified_at IS NOT NULL
           ))
         RETURNING user_id, purpose
       ), verified AS (
         UPDATE users u SET email_verified_at = COALESCE(u.email_verified_at, now()), updated_at = now()
         FROM consumed c WHERE u.id = c.user_id AND c.purpose = 'verify_email'
         RETURNING u.id
       ), eligible AS (
         SELECT id AS user_id FROM verified
         UNION ALL
         SELECT user_id FROM consumed WHERE purpose = 'sign_in'
       ), session_created AS (
         INSERT INTO auth_sessions (user_id, token_hash, expires_at)
         SELECT user_id, $2, now() + interval '30 days' FROM eligible
         RETURNING user_id
       )
       SELECT user_id FROM session_created LIMIT 1`,
      [hash(token), hash(sessionToken)]
    );
    if (!rows.length) return NextResponse.redirect(new URL("/sign-in?error=invalid-link", request.url));

    const response = NextResponse.redirect(new URL("/dashboard", request.url));
    response.cookies.set("linkwell_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL("/sign-in?error=service-unavailable", request.url));
  }
}
