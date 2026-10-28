import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  const user = await requireRole(["talent"]);
  if (!user) return NextResponse.json({ error: "Verified talent account required." }, { status: 403 });
  try {
    const applications = await getDb().query(
      `SELECT a.id, a.job_id, a.status, a.cover_letter, a.created_at, a.updated_at,
              j.title, j.company_name, j.location, j.work_arrangement, j.listing_type
       FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.talent_user_id = $1::uuid
       ORDER BY a.created_at DESC LIMIT 200`,
      [user.id]
    );
    return NextResponse.json({ applications });
  } catch {
    return NextResponse.json({ error: "Could not load your applications." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await requireRole(["talent"]);
  if (!user) return NextResponse.json({ error: "Sign in with a verified talent account to apply." }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 8000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const jobId = typeof body.job_id === "string" ? body.job_id : "";
  const coverLetter = typeof body.cover_letter === "string" ? body.cover_letter.trim().slice(0, 5000) : "";
  if (!uuidPattern.test(jobId)) return NextResponse.json({ error: "A valid opportunity is required." }, { status: 400 });
  try {
    const rows = await getDb().query(
      `INSERT INTO applications (job_id, talent_user_id, cover_letter)
       SELECT j.id, $2::uuid, NULLIF($3, '')
       FROM jobs j
       WHERE j.id = $1::uuid AND j.status = 'published'
         AND (j.expires_at IS NULL OR j.expires_at > now())
       ON CONFLICT (job_id, talent_user_id) DO NOTHING
       RETURNING id, job_id, status, created_at`,
      [jobId, user.id, coverLetter]
    );
    if (rows.length) return NextResponse.json({ application: rows[0] }, { status: 201 });
    const existing = await getDb().query(
      "SELECT id, status FROM applications WHERE job_id = $1::uuid AND talent_user_id = $2::uuid LIMIT 1",
      [jobId, user.id]
    );
    if (existing.length) return NextResponse.json({ error: "You have already applied for this opportunity.", application: existing[0] }, { status: 409 });
    return NextResponse.json({ error: "This opportunity is no longer accepting applications." }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "Could not submit your application. Please try again." }, { status: 503 });
  }
}
