import { getNeonAuth } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const auth = getNeonAuth();

async function unavailable() {
  return Response.json(
    { error: "Managed authentication is not configured. Please try again later." },
    { status: 503 }
  );
}

// Keep the route build-safe when deployment variables are not configured.
// Once valid variables exist, forward all supported methods to Neon Auth.
export const GET = auth ? auth.handler().GET : unavailable;
export const POST = auth ? auth.handler().POST : unavailable;
export const PUT = auth ? auth.handler().PUT : unavailable;
export const PATCH = auth ? auth.handler().PATCH : unavailable;
export const DELETE = auth ? auth.handler().DELETE : unavailable;
