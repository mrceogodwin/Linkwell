import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const listingTypes = new Set(["full_time", "part_time", "freelance", "contract"]);
const arrangements = new Set(["remote", "hybrid", "on_site"]);

export async function GET() {
  const employer = await requireRole(["employer"]);
  if (!employer) return NextResponse.json({ error: "Verified employer access required." }, { status: 403 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });
  try {
    const sql = getDb();
    const rows = await sql.query(
      `SELECT j.id, j.title, j.category, j.listing_type, j.work_arrangement, j.location,
              j.status, j.submitted_at, j.created_at, j.review_reason
       FROM jobs j WHERE j.employer_user_id = $1::uuid
       ORDER BY j.created_at DESC LIMIT 100`,
      [employer.id]
    );
    return NextResponse.json({ jobs: rows });
  } catch {
    return NextResponse.json({ error: "Unable to load your listings." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const employer = await requireRole(["employer"]);
  if (!employer) return NextResponse.json({ error: "Verified employer access required." }, { status: 403 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Database is not configured." }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 30000) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON request." }, { status: 400 });
  }

  const text = (key: string, max: number) => typeof body[key] === "string" ? (body[key] as string).trim().slice(0, max) : "";
  const title = text("title", 140);
  const description = text("description", 12000);
  const requirements = text("requirements", 8000);
  const category = text("category", 80);
  const listingType = text("listing_type", 30);
  const workArrangement = text("work_arrangement", 30);
  const location = text("location", 160);
  const currency = text("salary_currency", 3).toUpperCase();
  const period = text("salary_period", 30);
  const applicationUrl = text("application_url", 1500);
  const numeric = (key: string): number | null => {
    const value = body[key];
    if (value === null || value === undefined || value === "") return null;
    if (typeof value !== "number" && typeof value !== "string") return NaN;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
  };
  const salaryMin = numeric("salary_min");
  const salaryMax = numeric("salary_max");

  if (title.length < 4 || description.length < 30 || !category ||
      !listingTypes.has(listingType) || !arrangements.has(workArrangement)) {
    return NextResponse.json({ error: "Provide a title, description of at least 30 characters, category, opportunity type and work arrangement." }, { status: 400 });
  }
  if (Number.isNaN(salaryMin) || Number.isNaN(salaryMax) ||
      (salaryMin !== null && salaryMax !== null && salaryMax < salaryMin)) {
    return NextResponse.json({ error: "Check the salary range." }, { status: 400 });
  }
  if ((salaryMin !== null || salaryMax !== null) && !/^[A-Z]{3}$/.test(currency)) {
    return NextResponse.json({ error: "Provide a three-letter salary currency when entering pay." }, { status: 400 });
  }
  if (applicationUrl) {
    try {
      const url = new URL(applicationUrl);
      if (url.protocol !== "https:") throw new Error("https_required");
    } catch {
      return NextResponse.json({ error: "Application link must be a valid HTTPS URL." }, { status: 400 });
    }
  }

  try {
    const sql = getDb();
    const rows = await sql.query(
      `INSERT INTO jobs
       (employer_user_id, title, company_name, description, requirements, category,
        listing_type, work_arrangement, location, salary_min, salary_max, salary_currency,
        salary_period, application_url, status, submitted_at)
       SELECT ep.user_id, $2, ep.company_name, $3, NULLIF($4, ''), $5,
              $6::listing_type, $7::work_arrangement, NULLIF($8, ''), $9, $10,
              CASE WHEN $9 IS NULL AND $10 IS NULL THEN NULL ELSE $11::char(3) END,
              NULLIF($12, ''), NULLIF($13, ''), 'pending_review'::listing_status, now()
       FROM employer_profiles ep
       WHERE ep.user_id = $1::uuid AND ep.verified_at IS NOT NULL
       RETURNING id, title, status, submitted_at`,
      [employer.id, title, description, requirements, category, listingType, workArrangement,
       location, salaryMin, salaryMax, currency || null, period, applicationUrl]
    );
    if (!rows.length) {
      return NextResponse.json({ error: "Your company profile must be verified before you can submit listings." }, { status: 403 });
    }
    return NextResponse.json({ job: rows[0], message: "Listing submitted for administrator review." }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not submit the listing. Please check the database schema and try again." }, { status: 503 });
  }
}
