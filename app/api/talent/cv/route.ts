import { randomUUID } from "node:crypto";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { CV_TYPES, MAX_CV_BYTES, getCvBucket, getCvStorageClient, validCvSignature } from "@/lib/cv-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contentTypes = new Map([
  ["application/pdf", "pdf"],
  ["application/msword", "doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
]);

export async function POST(request: Request) {
  const user = await requireRole(["talent"]);
  if (!user) return NextResponse.json({ error: "Verified talent account required." }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 3000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const contentType = typeof body.content_type === "string" ? body.content_type : "";
  const size = typeof body.size === "number" ? body.size : 0;
  if (!CV_TYPES.has(contentType) || !Number.isInteger(size) || size < 1 || size > MAX_CV_BYTES) {
    return NextResponse.json({ error: "Upload a PDF, DOC or DOCX file no larger than 10 MB." }, { status: 400 });
  }

  try {
    const bucket = getCvBucket();
    const key = `private/${user.id}/${randomUUID()}.${contentTypes.get(contentType)}`;
    const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, ContentLength: size });
    const uploadUrl = await getSignedUrl(getCvStorageClient(), command, { expiresIn: 300 });
    return NextResponse.json({ upload_url: uploadUrl, object_key: key, expires_in: 300 });
  } catch {
    return NextResponse.json({ error: "Private CV storage is not configured yet." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const user = await requireRole(["talent"]);
  if (!user) return NextResponse.json({ error: "Verified talent account required." }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 2000) return NextResponse.json({ error: "Request too large." }, { status: 413 });
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }

  const key = typeof body.object_key === "string" ? body.object_key : "";
  if (!key.startsWith(`private/${user.id}/`) || key.includes("..") || key.length > 300) {
    return NextResponse.json({ error: "Invalid CV upload reference." }, { status: 400 });
  }

  try {
    const client = getCvStorageClient();
    const bucket = getCvBucket();
    const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    const contentType = head.ContentType ?? "";
    const size = head.ContentLength ?? 0;
    if (!CV_TYPES.has(contentType) || size < 1 || size > MAX_CV_BYTES) {
      return NextResponse.json({ error: "Uploaded file type or size is not allowed." }, { status: 400 });
    }
    const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: "bytes=0-15" }));
    const bytes = object.Body ? new Uint8Array(await object.Body.transformToByteArray()) : new Uint8Array();
    if (!validCvSignature(bytes, contentType)) {
      await client.send(new (await import("@aws-sdk/client-s3")).DeleteObjectCommand({ Bucket: bucket, Key: key }));
      return NextResponse.json({ error: "The file contents do not match the selected document type." }, { status: 400 });
    }
    const rows = await getDb().query(
      "UPDATE talent_profiles SET cv_object_key = $2, updated_at = now() WHERE user_id = $1::uuid RETURNING user_id",
      [user.id, key]
    );
    if (!rows.length) return NextResponse.json({ error: "Talent profile not found." }, { status: 404 });
    return NextResponse.json({ message: "CV uploaded securely." });
  } catch {
    return NextResponse.json({ error: "Could not verify and save this CV. Please try again." }, { status: 503 });
  }
}

export async function GET() {
  const user = await requireRole(["talent"]);
  if (!user) return NextResponse.json({ error: "Verified talent account required." }, { status: 403 });
  try {
    const rows = await getDb().query("SELECT cv_object_key FROM talent_profiles WHERE user_id = $1::uuid LIMIT 1", [user.id]);
    const key = (rows[0] as { cv_object_key?: string } | undefined)?.cv_object_key;
    if (!key || !key.startsWith(`private/${user.id}/`)) return NextResponse.json({ error: "No CV uploaded." }, { status: 404 });
    const url = await getSignedUrl(getCvStorageClient(), new GetObjectCommand({
      Bucket: getCvBucket(), Key: key, ResponseContentDisposition: "attachment",
    }), { expiresIn: 120 });
    return NextResponse.json({ download_url: url, expires_in: 120 });
  } catch {
    return NextResponse.json({ error: "Could not prepare your CV download." }, { status: 503 });
  }
}
