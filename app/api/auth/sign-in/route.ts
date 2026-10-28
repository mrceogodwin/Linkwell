import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const genericMessage = "If a verified Linkwell account exists for that email, a sign-in link will arrive shortly.";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL || !process.env.BREVO_API_KEY || !process.env.LINKWELL_FROM_EMAIL || !process.env.NEXT_PUBLIC_APP_URL) {
    return NextResponse.json({ error: "Sign-in is temporarily unavailable. Please try again later." }, { status: 503 });
  }
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 5000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const sql = getDb();
    const users = await sql.query("SELECT id FROM users WHERE lower(email) = $1 AND email_verified_at IS NOT NULL AND disabled_at IS NULL LIMIT 1", [email]);
    if (users.length) {
      const userId = String(users[0].id);
      const recent = await sql.query(
        "SELECT id FROM auth_email_tokens WHERE user_id = $1::uuid AND purpose = 'sign_in' AND created_at > now() - interval '60 seconds' LIMIT 1",
        [userId]
      );
      if (!recent.length) {
        const token = randomBytes(32).toString("base64url");
        const tokenHash = hash(token);
        await sql.query("DELETE FROM auth_email_tokens WHERE user_id = $1::uuid AND purpose = 'sign_in'", [userId]);
        await sql.query(
          "INSERT INTO auth_email_tokens (user_id, token_hash, purpose, expires_at) VALUES ($1::uuid, $2, 'sign_in', now() + interval '15 minutes')",
          [userId, tokenHash]
        );
        const link = new URL("/api/auth/verify", process.env.NEXT_PUBLIC_APP_URL);
        link.searchParams.set("token", token);
        const sent = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            sender: { email: process.env.LINKWELL_FROM_EMAIL, name: "Linkwell" },
            to: [{ email: String(users[0].email ?? email) }],
            subject: "Your Linkwell sign-in link",
            htmlContent: '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#171a18"><h1>Sign in to Linkwell</h1><p>This secure link expires in 15 minutes and can only be used once.</p><p><a href="' + link.toString() + '" style="display:inline-block;background:#123D2B;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">Sign in to Linkwell</a></p><p>If you did not request this, you can ignore this email.</p></div>'
          })
        });
        if (!sent.ok) {
          await sql.query("DELETE FROM auth_email_tokens WHERE token_hash = $1", [tokenHash]);
          return NextResponse.json({ error: "We could not send your sign-in email. Please try again later." }, { status: 502 });
        }
      }
    }
    return NextResponse.json({ message: genericMessage }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Sign-in service is temporarily unavailable." }, { status: 503 });
  }
}
