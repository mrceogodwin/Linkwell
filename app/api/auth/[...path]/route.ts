import { getNeonAuth } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const auth = getNeonAuth();
const handlers = auth?.handler();

async function unavailable() {
  return Response.json(
    { error: "Managed authentication is not configured. Please try again later." },
    { status: 503 }
  );
}

// Keep the route build-safe when deployment variables are not configured.
// Once valid variables exist, forward all supported methods to Neon Auth.
export const GET = handlers?.GET ?? unavailable;
export const POST = handlers?.POST ?? unavailable;
export const PUT = handlers?.PUT ?? unavailable;
export const PATCH = handlers?.PATCH ?? unavailable;
export const DELETE = handlers?.DELETE ?? unavailable;
