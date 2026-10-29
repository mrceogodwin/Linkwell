import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const genericMessage = "If a verified Linkwell account exists for that email, a sign-in link will arrive shortly.";

function safeInternalPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "";
  try {
    const parsed = new URL(value, "https://linkwell.invalid");
    return parsed.origin === "https://linkwell.invalid" ? parsed.pathname + parsed.search + parsed.hash : "";
  } catch {
    return "";
  }
}

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
  const nextPath = safeInternalPath(body.next);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    const sql = getDb();
    const users = await sql.query(
      "SELECT id, email FROM users WHERE lower(email) = $1 AND email_verified_at IS NOT NULL AND disabled_at IS NULL LIMIT 1",
      [email]
    );
    const user = users[0] as { id: string; email: string } | undefined;

    // Return the same message for unknown accounts to avoid exposing account existence.
    if (!user) return NextResponse.json({ message: genericMessage });

    const recent = await sql.query(
      "SELECT id FROM auth_email_tokens WHERE user_id = $1::uuid AND purpose = 'sign_in' AND created_at > now() - interval '60 seconds' LIMIT 1",
      [user.id]
    );
    if (recent.length) return NextResponse.json({ message: genericMessage });

    const token = randomBytes(32).toString("base64url");
    const tokenHash = hash(token);
    // Keep any existing sign-in link valid until the replacement email is confirmed sent.
    await sql.query(
      "INSERT INTO auth_email_tokens (user_id, token_hash, purpose, expires_at) VALUES ($1::uuid, $2, 'sign_in', now() + interval '15 minutes')",
      [user.id, tokenHash]
    );

    const link = new URL("/api/auth/verify", process.env.NEXT_PUBLIC_APP_URL);
    link.searchParams.set("token", token);
    if (nextPath) link.searchParams.set("next", nextPath);
    const sent = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        sender: { email: process.env.LINKWELL_FROM_EMAIL, name: "Linkwell" },
        to: [{ email: user.email }],
        subject: "Your Linkwell sign-in link",
        htmlContent: '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#171a18"><h1>Sign in to Linkwell</h1><p>This secure link expires in 15 minutes and can only be used once.</p><p><a href="' + link.toString() + '" style="display:inline-block;background:#123D2B;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">Sign in to Linkwell</a></p><p>If you did not request this, you can ignore this email.</p></div>'
      })
    });

    if (!sent.ok) {
      await sql.query("DELETE FROM auth_email_tokens WHERE token_hash = $1", [tokenHash]);
      return NextResponse.json({ error: "We could not send your sign-in email. Please try again later." }, { status: 502 });
    }

    // Retire older links only after the replacement email was accepted by the provider.
    await sql.query(
      "DELETE FROM auth_email_tokens WHERE user_id = $1::uuid AND purpose = 'sign_in' AND token_hash <> $2",
      [user.id, tokenHash]
    );

    return NextResponse.json({ message: genericMessage });
  } catch {
    return NextResponse.json({ error: "Sign-in service is temporarily unavailable." }, { status: 503 });
  }
}
