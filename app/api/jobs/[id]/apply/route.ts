import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const talent = await requireRole(["talent"]);
  if (!talent) return NextResponse.json({ error: "Sign in with a verified talent account to apply." }, { status: 403 });
  const { id } = await context.params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 8000) return NextResponse.json({ error: "Application is too large." }, { status: 413 });
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid application request." }, { status: 400 });
  }
  const coverLetter = typeof body.cover_letter === "string" ? body.cover_letter.trim().slice(0, 5000) : "";
  try {
    const sql = getDb();
    const rows = await sql.query(
      `INSERT INTO applications (job_id, talent_user_id, cover_letter)
       SELECT j.id, $2::uuid, NULLIF($3::text, '')
       FROM jobs j
       JOIN employer_profiles ep ON ep.user_id = j.employer_user_id AND ep.verified_at IS NOT NULL
       JOIN users eu ON eu.id = ep.user_id AND eu.email_verified_at IS NOT NULL AND eu.disabled_at IS NULL
       WHERE j.id = $1::uuid AND j.status = 'published'
         AND (j.expires_at IS NULL OR j.expires_at > now())
       ON CONFLICT (job_id, talent_user_id) DO NOTHING
       RETURNING id, status, created_at`,
      [id, talent.id, coverLetter]
    );
    if (rows.length) return NextResponse.json({ message: "Your application has been submitted.", application: rows[0] }, { status: 201 });

    const job = await sql.query("SELECT j.id FROM jobs j JOIN employer_profiles ep ON ep.user_id = j.employer_user_id AND ep.verified_at IS NOT NULL JOIN users eu ON eu.id = ep.user_id AND eu.email_verified_at IS NOT NULL AND eu.disabled_at IS NULL WHERE j.id = $1::uuid AND j.status = 'published' AND (j.expires_at IS NULL OR j.expires_at > now()) LIMIT 1", [id]);
    if (!job.length) return NextResponse.json({ error: "This opportunity is no longer available." }, { status: 404 });
    const existing = await sql.query("SELECT id, status, created_at FROM applications WHERE job_id = $1::uuid AND talent_user_id = $2::uuid LIMIT 1", [id, talent.id]);
    if (existing.length) return NextResponse.json({ error: "You have already applied to this opportunity.", application: existing[0] }, { status: 409 });
    return NextResponse.json({ error: "We could not submit your application." }, { status: 503 });
  } catch {
    return NextResponse.json({ error: "Application service is temporarily unavailable." }, { status: 503 });
  }
}
