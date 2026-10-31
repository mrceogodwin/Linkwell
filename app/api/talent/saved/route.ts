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
    const jobs = await getDb().query(
      `SELECT j.id, j.title, j.company_name, j.category, j.listing_type, j.work_arrangement,
              j.location, j.salary_min, j.salary_max, j.salary_currency, j.salary_period,
              j.published_at, s.created_at AS saved_at
       FROM saved_jobs s
       JOIN jobs j ON j.id = s.job_id
       JOIN employer_profiles ep ON ep.user_id = j.employer_user_id AND ep.verified_at IS NOT NULL
       JOIN users eu ON eu.id = ep.user_id AND eu.email_verified_at IS NOT NULL AND eu.disabled_at IS NULL
       WHERE s.talent_user_id = $1::uuid AND j.status = 'published'
         AND (j.expires_at IS NULL OR j.expires_at > now())
       ORDER BY s.created_at DESC LIMIT 200`,
      [user.id]
    );
    return NextResponse.json({ jobs });
  } catch {
    return NextResponse.json({ error: "Could not load saved opportunities." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const user = await requireRole(["talent"]);
  if (!user) return NextResponse.json({ error: "Verified talent account required." }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 2000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const jobId = typeof body.job_id === "string" ? body.job_id : "";
  if (!uuidPattern.test(jobId)) return NextResponse.json({ error: "Valid job ID required." }, { status: 400 });
  try {
    const rows = await getDb().query(
      `INSERT INTO saved_jobs (talent_user_id, job_id)
       SELECT $1::uuid, j.id FROM jobs j
       JOIN employer_profiles ep ON ep.user_id = j.employer_user_id AND ep.verified_at IS NOT NULL
       JOIN users eu ON eu.id = ep.user_id AND eu.email_verified_at IS NOT NULL AND eu.disabled_at IS NULL
       WHERE j.id = $2::uuid AND j.status = 'published'
         AND (j.expires_at IS NULL OR j.expires_at > now())
       ON CONFLICT (talent_user_id, job_id) DO NOTHING
       RETURNING job_id`,
      [user.id, jobId]
    );
    if (!rows.length) {
      const exists = await getDb().query("SELECT j.id FROM jobs j JOIN employer_profiles ep ON ep.user_id = j.employer_user_id AND ep.verified_at IS NOT NULL JOIN users eu ON eu.id = ep.user_id AND eu.email_verified_at IS NOT NULL AND eu.disabled_at IS NULL WHERE j.id = $1::uuid AND j.status = 'published' AND (j.expires_at IS NULL OR j.expires_at > now()) LIMIT 1", [jobId]);
      if (!exists.length) return NextResponse.json({ error: "Published opportunity not found." }, { status: 404 });
    }
    return NextResponse.json({ saved: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Could not save this opportunity." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const user = await requireRole(["talent"]);
  if (!user) return NextResponse.json({ error: "Verified talent account required." }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 2000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const jobId = typeof body.job_id === "string" ? body.job_id : "";
  if (!uuidPattern.test(jobId)) return NextResponse.json({ error: "Valid job ID required." }, { status: 400 });
  try {
    await getDb().query("DELETE FROM saved_jobs WHERE talent_user_id = $1::uuid AND job_id = $2::uuid", [user.id, jobId]);
    return NextResponse.json({ saved: false });
  } catch {
    return NextResponse.json({ error: "Could not remove this saved opportunity." }, { status: 503 });
  }
}
