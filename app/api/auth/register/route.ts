import { NextResponse } from "next/server";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Account service is temporarily unavailable." }, { status: 503 });
  if (!process.env.RESEND_API_KEY || !process.env.LINKWELL_FROM_EMAIL || !process.env.NEXT_PUBLIC_APP_URL) {
    return NextResponse.json({ error: "Account verification email is not configured yet. Please try again later." }, { status: 503 });
  }
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 10000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const displayName = typeof body.display_name === "string" ? body.display_name.trim().slice(0, 100) : "";
  const role = body.role === "employer" ? "employer" : body.role === "talent" ? "talent" : "";
  const companyName = typeof body.company_name === "string" ? body.company_name.trim().slice(0, 160) : "";

  if (!emailPattern.test(email) || email.length > 254 || displayName.length < 2 || !role || (role === "employer" && companyName.length < 2)) {
    return NextResponse.json({ error: "Enter a valid email, your name, an account type, and a company name for employer accounts." }, { status: 400 });
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hash(token);
  const userId = randomUUID();
  const providerId = "linkwell:" + userId;
  const verifyUrl = new URL("/api/auth/verify", process.env.NEXT_PUBLIC_APP_URL);
  verifyUrl.searchParams.set("token", token);

  try {
    const sql = getDb();
    const existing = await sql.query("SELECT id, email_verified_at FROM users WHERE lower(email) = $1 LIMIT 1", [email]);
    if (existing.length) return NextResponse.json({ error: "An account with this email already exists. Please sign in or request a verification link." }, { status: 409 });

    await sql.query(
      "INSERT INTO users (id, auth_provider_id, email, display_name, role) VALUES ($1::uuid, $2, $3, $4, $5::user_role)",
      [userId, providerId, email, displayName, role]
    );
    if (role === "employer") {
      await sql.query("INSERT INTO employer_profiles (user_id, company_name) VALUES ($1::uuid, $2)", [userId, companyName]);
    } else {
      await sql.query("INSERT INTO talent_profiles (user_id) VALUES ($1::uuid)", [userId]);
    }
    await sql.query(
      "INSERT INTO auth_email_tokens (user_id, token_hash, purpose, expires_at) VALUES ($1::uuid, $2, 'verify_email', now() + interval '30 minutes')",
      [userId, tokenHash]
    );

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.LINKWELL_FROM_EMAIL,
        to: [email],
        subject: "Verify your Linkwell email",
        html: '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#171a18"><h1>Welcome to Linkwell</h1><p>Confirm your email to activate your account.</p><p><a href="' + verifyUrl.toString() + '" style="display:inline-block;background:#123D2B;color:white;padding:12px 18px;border-radius:8px;text-decoration:none">Verify email</a></p><p>This link expires in 30 minutes. If you did not create this account, you can ignore this message.</p></div>'
      })
    });
    if (!emailResponse.ok) {
      await sql.query("DELETE FROM auth_email_tokens WHERE token_hash = $1", [tokenHash]);
      return NextResponse.json({ error: "We could not send the verification email. Check the email service configuration and try again." }, { status: 502 });
    }
    return NextResponse.json({ message: "Account created. Check your email for a verification link." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Account creation failed. Please try again." }, { status: 503 });
  }
}
