import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReviewBody = { decision?: unknown; reason?: unknown };

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireRole(["admin"]);
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });

  const { id } = await context.params;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(id)) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  let body: ReviewBody;
  try {
    const raw = await request.text();
    if (raw.length > 4000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    body = JSON.parse(raw) as ReviewBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  if (body.decision !== "approve" && body.decision !== "reject") {
    return NextResponse.json({ error: "Decision must be approve or reject." }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
  if (body.decision === "reject" && reason.length < 5) {
    return NextResponse.json({ error: "A rejection reason of at least five characters is required." }, { status: 400 });
  }

  try {
    const sql = getDb();
    const rows = await sql.query(
      `WITH changed AS (
         UPDATE jobs
         SET status = CASE WHEN $2::text = 'approve' THEN 'published'::listing_status ELSE 'rejected'::listing_status END,
             reviewed_by = $3::uuid,
             reviewed_at = now(),
             published_at = CASE WHEN $2::text = 'approve' THEN now() ELSE NULL END,
             review_reason = CASE WHEN $2::text = 'reject' THEN $4::text ELSE NULL END,
             updated_at = now()
         WHERE id = $1::uuid AND status = 'pending_review'
           AND (
             $2::text <> 'approve'
             OR EXISTS (
               SELECT 1
               FROM employer_profiles ep
               JOIN users eu ON eu.id = ep.user_id
               WHERE ep.user_id = jobs.employer_user_id
                 AND ep.verified_at IS NOT NULL
                 AND eu.email_verified_at IS NOT NULL
                 AND eu.disabled_at IS NULL
             )
           )
         RETURNING id, title, company_name, status, reviewed_at
       ),
       logged AS (
         INSERT INTO admin_audit_logs (actor_user_id, action, entity_type, entity_id, reason, metadata)
         SELECT $3::uuid, CASE WHEN $2::text = 'approve' THEN 'job.approved' ELSE 'job.rejected' END,
                'job', changed.id::text, NULLIF($4::text, ''),
                jsonb_build_object('title', changed.title, 'status', changed.status)
         FROM changed
         RETURNING id
       )
       SELECT changed.id, changed.title, changed.company_name, changed.status, changed.reviewed_at
       FROM changed CROSS JOIN logged`,
      [id, body.decision, admin.id, reason || null]
    );
    if (!rows.length) {
      return NextResponse.json({ error: "Listing not found or not awaiting review." }, { status: 409 });
    }
    return NextResponse.json({ job: rows[0] });
  } catch {
    return NextResponse.json({ error: "Could not update this listing. Check the database migration and try again." }, { status: 503 });
  }
}
