import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Opportunity search is not configured yet." }, { status: 503 });
  }
  const { id } = await context.params;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
  try {
    const sql = getDb();
    const rows = await sql.query(
      `SELECT j.id, j.title, j.company_name AS company, j.description, j.requirements, j.category,
              j.listing_type, j.work_arrangement, j.location, j.salary_min, j.salary_max,
              j.salary_currency, j.salary_period, j.application_url, j.published_at
       FROM jobs j
       JOIN employer_profiles ep ON ep.user_id = j.employer_user_id AND ep.verified_at IS NOT NULL
       JOIN users eu ON eu.id = ep.user_id AND eu.email_verified_at IS NOT NULL AND eu.disabled_at IS NULL
       WHERE j.id = $1::uuid
         AND j.status = 'published'
         AND (j.expires_at IS NULL OR j.expires_at > now())
       LIMIT 1`,
      [id]
    );
    if (!rows.length) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
    return NextResponse.json({ job: rows[0] });
  } catch {
    return NextResponse.json({ error: "Unable to load this opportunity right now." }, { status: 503 });
  }
}
