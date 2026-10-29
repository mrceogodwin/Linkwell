import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedStatuses = new Set(["reviewing", "shortlisted", "rejected", "hired"]);

export async function GET() {
  const employer = await requireRole(["employer"]);
  if (!employer) return NextResponse.json({ error: "Verified employer access required." }, { status: 403 });
  try {
    const applications = await getDb().query(
      `SELECT a.id, a.job_id, a.status, a.cover_letter, a.created_at, a.updated_at,
              a.employer_notes, u.display_name AS applicant_name, u.email AS applicant_email,
              j.title AS job_title
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       JOIN users u ON u.id = a.talent_user_id
       WHERE j.employer_user_id = $1::uuid
       ORDER BY a.created_at DESC LIMIT 300`,
      [employer.id]
    );
    return NextResponse.json({ applications });
  } catch {
    return NextResponse.json({ error: "Could not load applicants right now." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const employer = await requireRole(["employer"]);
  if (!employer) return NextResponse.json({ error: "Verified employer access required." }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 6000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const id = typeof body.application_id === "string" ? body.application_id : "";
  const hasStatus = Object.prototype.hasOwnProperty.call(body, "status");
  const status = typeof body.status === "string" ? body.status : null;
  const notes = typeof body.employer_notes === "string" ? body.employer_notes.trim().slice(0, 2000) : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || (hasStatus && (!status || !allowedStatuses.has(status)))) {
    return NextResponse.json({ error: "Choose a valid application and status." }, { status: 400 });
  }
  try {
    const rows = await getDb().query(
      `UPDATE applications a
       SET status = CASE WHEN $3::text IS NULL THEN a.status ELSE $3::application_status END,
           employer_notes = NULLIF($4, ''), updated_at = now()
       FROM jobs j
       WHERE a.id = $1::uuid AND a.job_id = j.id AND j.employer_user_id = $2::uuid
       RETURNING a.id, a.status, a.employer_notes, a.updated_at`,
      [id, employer.id, status, notes]
    );
    if (!rows.length) return NextResponse.json({ error: "Application not found for your company." }, { status: 404 });
    return NextResponse.json({ message: "Application updated.", application: rows[0] });
  } catch {
    return NextResponse.json({ error: "Could not update this application." }, { status: 503 });
  }
}
