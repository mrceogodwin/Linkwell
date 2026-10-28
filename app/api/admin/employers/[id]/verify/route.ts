import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await requireRole(["admin"]);
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const { id } = await context.params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: "Employer not found." }, { status: 404 });
  let body: Record<string, unknown>;
  try { const raw = await request.text(); if (raw.length > 3000) return NextResponse.json({ error: "Request too large." }, { status: 413 }); body = JSON.parse(raw) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  if (body.decision !== "verify" && body.decision !== "unverify") return NextResponse.json({ error: "Decision must be verify or unverify." }, { status: 400 });
  const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 1000) : "";
  if (body.decision === "unverify" && reason.length < 5) return NextResponse.json({ error: "Provide a reason of at least five characters when removing verification." }, { status: 400 });
  try {
    const rows = await getDb().query(
      "WITH changed AS (UPDATE employer_profiles ep SET verified_at = CASE WHEN $2::text = 'verify' THEN COALESCE(ep.verified_at, now()) ELSE NULL END, updated_at = now() FROM users u WHERE ep.user_id = $1::uuid AND u.id = ep.user_id AND u.email_verified_at IS NOT NULL RETURNING ep.user_id, ep.company_name, ep.verified_at), logged AS (INSERT INTO admin_audit_logs (actor_user_id, action, entity_type, entity_id, reason, metadata) SELECT $3::uuid, CASE WHEN $2::text = 'verify' THEN 'employer.verified' ELSE 'employer.unverified' END, 'employer', changed.user_id::text, NULLIF($4::text, ''), jsonb_build_object('company_name', changed.company_name, 'verified', changed.verified_at IS NOT NULL) FROM changed RETURNING id) SELECT changed.user_id, changed.company_name, changed.verified_at FROM changed CROSS JOIN logged",
      [id, body.decision, admin.id, reason || null]
    );
    if (!rows.length) return NextResponse.json({ error: "Employer not found or email not verified." }, { status: 404 });
    return NextResponse.json({ employer: rows[0] });
  } catch { return NextResponse.json({ error: "Could not update employer verification." }, { status: 503 }); }
}
