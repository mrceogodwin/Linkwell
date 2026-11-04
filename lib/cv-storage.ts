import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

export const MAX_CV_BYTES = 10 * 1024 * 1024;
export const CV_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export function getCvBucket() {
  const bucket = process.env.NEON_STORAGE_BUCKET;
  if (!bucket) throw new Error("NEON_STORAGE_BUCKET is not configured");
  return bucket;
}

export function getCvStorageClient() {
  const endpoint = process.env.AWS_ENDPOINT_URL_S3;
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
    throw new Error("Neon private object storage is not fully configured");
  }
  return new S3Client({
    endpoint,
    region,
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
}

export function validCvSignature(bytes: Uint8Array, contentType: string) {
  if (contentType === "application/pdf") return bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (contentType === "application/msword") {
    return bytes.length >= 8 && [0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1].every((v,i) => bytes[i] === v);
  }
  if (contentType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && [0x03,0x05,0x07].includes(bytes[2]) && [0x04,0x06,0x08].includes(bytes[3]);
  }
  return false;
}
