import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Talent discovery is not configured yet." }, { status: 503 });
  }

  const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  try {
    const rows = await getDb().query(
      `SELECT u.display_name, p.headline, p.biography, p.location, p.skills, p.portfolio_url
       FROM talent_profiles p
       JOIN users u ON u.id = p.user_id
       WHERE p.profile_visibility = true
         AND u.role = 'talent'
         AND u.email_verified_at IS NOT NULL
         AND u.disabled_at IS NULL
         AND ($1::text = '' OR
              u.display_name ILIKE '%' || $1 || '%' OR
              COALESCE(p.headline, '') ILIKE '%' || $1 || '%' OR
              COALESCE(p.biography, '') ILIKE '%' || $1 || '%' OR
              COALESCE(p.location, '') ILIKE '%' || $1 || '%' OR
              array_to_string(p.skills, ' ') ILIKE '%' || $1 || '%')
       ORDER BY p.updated_at DESC
       LIMIT 60`,
      [query]
    );
    return NextResponse.json({ talent: rows });
  } catch {
    return NextResponse.json({ error: "Unable to load talent profiles right now." }, { status: 503 });
  }
}
