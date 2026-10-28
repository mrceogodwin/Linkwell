import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const asText = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function GET() {
  const user = await requireRole(["talent"]);
  if (!user) return NextResponse.json({ error: "Verified talent account required." }, { status: 403 });
  try {
    const rows = await getDb().query(
      "SELECT headline, biography, location, skills, portfolio_url, profile_visibility, updated_at FROM talent_profiles WHERE user_id = $1::uuid LIMIT 1",
      [user.id]
    );
    if (!rows.length) return NextResponse.json({ error: "Talent profile not found." }, { status: 404 });
    return NextResponse.json({ profile: rows[0] });
  } catch {
    return NextResponse.json({ error: "Could not load your profile right now." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireRole(["talent"]);
  if (!user) return NextResponse.json({ error: "Verified talent account required." }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 12000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const headline = asText(body.headline, 120);
  const biography = asText(body.biography, 3000);
  const location = asText(body.location, 120);
  const portfolioUrl = asText(body.portfolio_url, 500);
  const rawSkills = Array.isArray(body.skills) ? body.skills : typeof body.skills === "string" ? body.skills.split(",") : [];
  const skills = [...new Set(rawSkills.filter((skill): skill is string => typeof skill === "string").map(skill => skill.trim().slice(0, 40)).filter(Boolean))].slice(0, 30);

  if (portfolioUrl) {
    try {
      const url = new URL(portfolioUrl);
      if (url.protocol !== "https:" || !url.hostname.includes(".")) throw new Error("invalid");
    } catch {
      return NextResponse.json({ error: "Portfolio link must be a valid HTTPS URL." }, { status: 400 });
    }
  }

  try {
    const sql = getDb();
    const rows = await sql.query(
      `UPDATE talent_profiles
       SET headline = $2, biography = $3, location = $4, skills = $5::text[],
           portfolio_url = NULLIF($6, ''), updated_at = now()
       WHERE user_id = $1::uuid
       RETURNING headline, biography, location, skills, portfolio_url, profile_visibility, updated_at`,
      [user.id, headline || null, biography || null, location || null, skills, portfolioUrl]
    );
    if (!rows.length) return NextResponse.json({ error: "Talent profile not found." }, { status: 404 });
    return NextResponse.json({ message: "Profile saved.", profile: rows[0] });
  } catch {
    return NextResponse.json({ error: "Could not save your profile right now." }, { status: 503 });
  }
}
