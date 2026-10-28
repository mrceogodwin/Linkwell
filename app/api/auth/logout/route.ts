import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { getNeonAuth } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Revoke the managed Neon Auth session as well as any legacy Linkwell session.
  try {
    const auth = getNeonAuth();
    if (auth) await auth.signOut();
  } catch {
    // Still clear the app session cookie below if Neon Auth is unavailable.
  }

  const token = (await cookies()).get("linkwell_session")?.value;
  if (token && process.env.DATABASE_URL) {
    try {
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await getDb().query("DELETE FROM auth_sessions WHERE token_hash = $1", [tokenHash]);
    } catch {
      // Clear the browser session even if the database is temporarily unavailable.
    }
  }
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set("linkwell_session", "", {
    httpOnly: true, secure: new URL(request.url).protocol === "https:",
    sameSite: "lax", path: "/", maxAge: 0
  });
  return response;
}
