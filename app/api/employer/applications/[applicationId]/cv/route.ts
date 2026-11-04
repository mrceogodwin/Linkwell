import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getCvBucket, getCvStorageClient } from "@/lib/cv-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ applicationId: string }> }) {
  const employer = await requireRole(["employer"]);
  if (!employer) return NextResponse.json({ error: "Verified employer access required." }, { status: 403 });
  const { applicationId } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(applicationId)) {
    return NextResponse.json({ error: "Invalid application." }, { status: 400 });
  }
  try {
    const rows = await getDb().query(
      `SELECT a.cv_object_key, a.talent_user_id
       FROM applications a
       JOIN jobs j ON j.id = a.job_id AND j.employer_user_id = $2::uuid
       JOIN employer_profiles ep ON ep.user_id = j.employer_user_id AND ep.verified_at IS NOT NULL
       JOIN users eu ON eu.id = ep.user_id AND eu.email_verified_at IS NOT NULL AND eu.disabled_at IS NULL
       WHERE a.id = $1::uuid LIMIT 1`,
      [applicationId, employer.id]
    );
    const record = rows[0] as { cv_object_key?: string | null; talent_user_id: string } | undefined;
    if (!record) return NextResponse.json({ error: "Application not found for your company." }, { status: 404 });
    const key = record.cv_object_key;
    if (!key || !key.startsWith(`private/${record.talent_user_id}/`)) {
      return NextResponse.json({ error: "No CV was attached to this application." }, { status: 404 });
    }
    const url = await getSignedUrl(getCvStorageClient(), new GetObjectCommand({
      Bucket: getCvBucket(), Key: key, ResponseContentDisposition: "attachment",
    }), { expiresIn: 120 });
    return NextResponse.json({ download_url: url, expires_in: 120 });
  } catch {
    return NextResponse.json({ error: "Could not prepare this CV download." }, { status: 503 });
  }
}
