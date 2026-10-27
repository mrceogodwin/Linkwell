import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const listingTypes: Record<string, string> = {
  "full-time": "full_time", full_time: "full_time",
  "part-time": "part_time", part_time: "part_time",
  freelance: "freelance", contract: "contract",
};
const arrangements: Record<string, string> = {
  remote: "remote", hybrid: "hybrid", "on-site": "on_site", on_site: "on_site",
};

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Opportunity search is not configured yet." }, { status: 503 });
  }
  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 120) || null;
  const typeInput = (params.get("type") ?? "").trim().toLowerCase();
  const workInput = (params.get("work") ?? "").trim().toLowerCase();
  const category = (params.get("category") ?? "").trim().slice(0, 80) || null;
  const type = typeInput ? listingTypes[typeInput] ?? null : null;
  const work = workInput ? arrangements[workInput] ?? null : null;

  try {
    const sql = getDb();
    const statement = [
      "SELECT id, title, company_name AS company, description, category,",
      "listing_type, work_arrangement, location, salary_min, salary_max,",
      "salary_currency, salary_period, published_at",
      "FROM jobs",
      "WHERE status = 'published'",
      "AND (expires_at IS NULL OR expires_at > now())",
      "AND ($1::text IS NULL OR title ILIKE '%' || $1 || '%' OR company_name ILIKE '%' || $1 || '%' OR description ILIKE '%' || $1 || '%' OR category ILIKE '%' || $1 || '%')",
      "AND ($2::listing_type IS NULL OR listing_type = $2::listing_type)",
      "AND ($3::work_arrangement IS NULL OR work_arrangement = $3::work_arrangement)",
      "AND ($4::text IS NULL OR category ILIKE '%' || $4 || '%')",
      "ORDER BY published_at DESC NULLS LAST, created_at DESC LIMIT 50"
    ].join(" ");
    const rows = await sql.query(statement, [q, type, work, category]);
    return NextResponse.json({ jobs: rows });
  } catch {
    return NextResponse.json({ error: "Unable to load opportunities right now." }, { status: 503 });
  }
}