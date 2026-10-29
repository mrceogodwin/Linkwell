import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const employer = await requireRole(["employer"]);
  if (!employer) return NextResponse.json({ error: "Verified employer access required." }, { status: 403 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });

  const { id } = await context.params;
  if (!uuidPattern.test(id)) return NextResponse.json({ error: "Listing not found." }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 1000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  // Employers may archive their own listings, but cannot approve, publish, or
  // otherwise change moderation state through this endpoint.
  if (body.status !== "archived") {
    return NextResponse.json({ error: "Employers can only archive their own listings here." }, { status: 400 });
  }

  try {
    const sql = getDb();
    const rows = await sql.query(
      `UPDATE jobs
       SET status = 'archived'::listing_status, updated_at = now()
       WHERE id = $1::uuid
         AND employer_user_id = $2::uuid
         AND status <> 'archived'
       RETURNING id, title, status, updated_at`,
      [id, employer.id]
    );
    if (rows.length) return NextResponse.json({ job: rows[0], message: "Listing archived. It is no longer available publicly." });

    const owned = await sql.query(
      "SELECT status FROM jobs WHERE id = $1::uuid AND employer_user_id = $2::uuid LIMIT 1",
      [id, employer.id]
    );
    if (!owned.length) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    if (owned[0].status === "archived") {
      return NextResponse.json({ error: "This listing is already archived." }, { status: 409 });
    }
    return NextResponse.json({ error: "This listing could not be archived." }, { status: 409 });
  } catch {
    return NextResponse.json({ error: "Unable to archive this listing right now." }, { status: 503 });
  }
}
