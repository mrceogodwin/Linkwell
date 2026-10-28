import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireRole(["admin"]);
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  try {
    const employers = await getDb().query(
      `SELECT u.id AS user_id, u.display_name, u.email, u.email_verified_at, u.disabled_at,
              ep.company_name, ep.website_url, ep.description, ep.location, ep.verified_at, ep.created_at
       FROM employer_profiles ep JOIN users u ON u.id = ep.user_id
       ORDER BY (ep.verified_at IS NULL) DESC, ep.created_at DESC LIMIT 500`
    );
    return NextResponse.json({ employers });
  } catch {
    return NextResponse.json({ error: "Could not load employer accounts." }, { status: 503 });
  }
}
