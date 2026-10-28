import { getNeonAuth } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function unavailable() {
  return Response.json(
    { error: "Managed authentication is not configured. Please try again later." },
    { status: 503 }
  );
}

// Resolve the handler when a request arrives, not at module evaluation time.
// This avoids permanently capturing the unavailable fallback if the module is
// evaluated before runtime environment variables are available.
async function forward(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  request: Request
) {
  const handlers = getNeonAuth()?.handler();
  const handler = handlers?.[method];
  return handler ? handler(request) : unavailable();
}

export async function GET(request: Request) {
  return forward("GET", request);
}

export async function POST(request: Request) {
  return forward("POST", request);
}

export async function PUT(request: Request) {
  return forward("PUT", request);
}

export async function PATCH(request: Request) {
  return forward("PATCH", request);
}

export async function DELETE(request: Request) {
  return forward("DELETE", request);
}
