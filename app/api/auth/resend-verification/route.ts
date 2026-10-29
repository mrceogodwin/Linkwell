import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const genericMessage = "If an unverified Linkwell account exists for that email, a new verification link will arrive shortly.";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL || !process.env.BREVO_API_KEY || !process.env.LINKWELL_FROM_EMAIL || !process.env.NEXT_PUBLIC_APP_URL) {
    return NextResponse.json({ error: "Verification email is temporarily unavailable. Please try again later." }, { status: 503 });
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
    const users = await sql.query(
      "SELECT id, email FROM users WHERE lower(email) = $1 AND email_verified_at IS NULL AND disabled_at IS NULL LIMIT 1",
      [email]
    );
    const user = users[0] as { id: string; email: string } | undefined;
    if (!user) return NextResponse.json({ message: genericMessage });

    const recent = await sql.query(
      "SELECT id FROM auth_email_tokens WHERE user_id = $1::uuid AND purpose = 'verify_email' AND created_at > now() - interval '60 seconds' LIMIT 1",
      [user.id]
    );
    if (recent.length) return NextResponse.json({ message: genericMessage });

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hash(token);
    await sql.query(
      "INSERT INTO auth_email_tokens (user_id, token_hash, purpose, expires_at) VALUES ($1::uuid, $2, 'verify_email', now() + interval '30 minutes')",
      [user.id, tokenHash]
    );

    const link = new URL("/api/auth/verify", process.env.NEXT_PUBLIC_APP_URL);
    link.searchParams.set("token", token);
    let sent: Response;
    try {
      sent = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        sender: { email: process.env.LINKWELL_FROM_EMAIL, name: "Linkwell" },
        to: [{ email: user.email }],
        subject: "Verify your Linkwell email",
        htmlContent: '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#171a18"><h1>Verify your Linkwell email</h1><p>Confirm your email to activate your account.</p><p><a href="' + link.toString() + '" style="display:inline-block;background:#123D2B;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">Verify email</a></p><p>This link expires in 30 minutes. If you did not create this account, you can ignore this message.</p></div>'
      })
      });
    } catch {
      await sql.query("DELETE FROM auth_email_tokens WHERE token_hash = $1", [tokenHash]);
      return NextResponse.json({ error: "We could not send your verification email. Please try again later." }, { status: 502 });
    }

    if (!sent.ok) {
      await sql.query("DELETE FROM auth_email_tokens WHERE token_hash = $1", [tokenHash]);
      return NextResponse.json({ error: "We could not send your verification email. Please try again later." }, { status: 502 });
    }

    await sql.query(
      "DELETE FROM auth_email_tokens WHERE user_id = $1::uuid AND purpose = 'verify_email' AND token_hash <> $2",
      [user.id, tokenHash]
    );
    return NextResponse.json({ message: genericMessage });
  } catch {
    return NextResponse.json({ error: "Verification service is temporarily unavailable." }, { status: 503 });
  }
}
