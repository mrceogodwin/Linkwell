import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getNeonAuth } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppRole = "talent" | "employer" | "admin";

function destinationFor(role: AppRole) {
  if (role === "employer") return "/dashboard/company";
  if (role === "admin") return "/admin";
  return "/dashboard";
}

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Account service is temporarily unavailable." }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 10000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const mode = body.mode === "signup" ? "signup" : body.mode === "signin" ? "signin" : "";
  if (!mode) return NextResponse.json({ error: "Invalid onboarding request." }, { status: 400 });

  const auth = getNeonAuth();
  if (!auth) return NextResponse.json({ error: "Managed authentication is not configured." }, { status: 503 });

  try {
    const authResult = await auth.getSession();
    const authUser = authResult?.data?.user as
      | { id?: unknown; email?: unknown; emailVerified?: unknown }
      | undefined;
    const email = typeof authUser?.email === "string" ? authUser.email.trim().toLowerCase() : "";
    const authId = typeof authUser?.id === "string" ? authUser.id : "";
    if (!authUser || !email || !authId) {
      return NextResponse.json({ error: "Please verify your email and sign in before continuing." }, { status: 401 });
    }
    if (authUser.emailVerified !== true) {
      return NextResponse.json({ error: "Your email must be verified before your Linkwell profile can be activated." }, { status: 403 });
    }

    const requestedRole: AppRole | "" =
      body.role === "employer" ? "employer" : body.role === "talent" ? "talent" : "";
    const displayName = typeof body.display_name === "string" ? body.display_name.trim().slice(0, 100) : "";
    const companyName = typeof body.company_name === "string" ? body.company_name.trim().slice(0, 160) : "";

    if (mode === "signup") {
      if (!requestedRole || displayName.length < 2) {
        return NextResponse.json({ error: "Enter your name and choose a valid account type." }, { status: 400 });
      }
      if (requestedRole === "employer" && companyName.length < 2) {
        return NextResponse.json({ error: "Enter your company name to create an employer account." }, { status: 400 });
      }
    }

    const sql = getDb();
    let rows = await sql.query(
      "SELECT id, email, display_name, role, email_verified_at, disabled_at FROM users WHERE lower(email) = $1 LIMIT 1",
      [email]
    );

    if (!rows.length && mode === "signin") {
      return NextResponse.json({ error: "No Linkwell profile was found for this email. Please create an account first." }, { status: 404 });
    }

    if (!rows.length && mode === "signup") {
      const createUserSql = [
        "WITH new_user AS (",
        "INSERT INTO users (id, auth_provider_id, email, display_name, role, email_verified_at)",
        "VALUES (gen_random_uuid(), $1, $2, $3, $4::user_role, now())",
        "ON CONFLICT DO NOTHING",
        "RETURNING id, email, display_name, role, email_verified_at, disabled_at",
        "), talent_profile AS (",
        "INSERT INTO talent_profiles (user_id)",
        "SELECT id FROM new_user WHERE role = 'talent'",
        "ON CONFLICT DO NOTHING RETURNING user_id",
        "), employer_profile AS (",
        "INSERT INTO employer_profiles (user_id, company_name)",
        "SELECT id, $5::text FROM new_user WHERE role = 'employer'",
        "ON CONFLICT DO NOTHING RETURNING user_id",
        ") SELECT * FROM new_user"
      ].join(" ");
      rows = await sql.query(createUserSql, [
        "neon:" + authId,
        email,
        displayName,
        requestedRole,
        companyName || null
      ]);

      // A concurrent signup may have created the same email. Re-read it and
      // preserve the existing role instead of overwriting account privileges.
      if (!rows.length) {
        rows = await sql.query(
          "SELECT id, email, display_name, role, email_verified_at, disabled_at FROM users WHERE lower(email) = $1 LIMIT 1",
          [email]
        );
      }
    }

    const user = rows[0] as
      | { id: string; email: string; display_name: string; role: AppRole; email_verified_at: string | null; disabled_at: string | null }
      | undefined;
    if (!user || user.disabled_at) {
      return NextResponse.json({ error: "This Linkwell account is unavailable. Please contact support if you need help." }, { status: 403 });
    }

    // Only create a missing profile for the role already stored on the user.
    // Never let signup input change an existing account's role.
    if (user.role === "talent") {
      await sql.query(
        "INSERT INTO talent_profiles (user_id) VALUES ($1::uuid) ON CONFLICT DO NOTHING",
        [user.id]
      );
    } else if (user.role === "employer") {
      const existingProfile = await sql.query(
        "SELECT user_id FROM employer_profiles WHERE user_id = $1::uuid LIMIT 1",
        [user.id]
      );
      if (!existingProfile.length) {
        if (companyName.length < 2) {
          return NextResponse.json({ error: "Complete your employer profile by providing your company name." }, { status: 409 });
        }
        await sql.query(
          "INSERT INTO employer_profiles (user_id, company_name) VALUES ($1::uuid, $2) ON CONFLICT DO NOTHING",
          [user.id, companyName]
        );
      }
    }

    return NextResponse.json({ ok: true, redirectTo: destinationFor(user.role) });
  } catch {
    return NextResponse.json({ error: "We could not finish setting up your Linkwell account. Please try again." }, { status: 503 });
  }
}
