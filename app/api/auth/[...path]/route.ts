import { getNeonAuth } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AuthRouteContext = { params: Promise<{ path: string[] }> };

async function unavailable() {
  return Response.json(
    { error: "Managed authentication is not configured. Please try again later." },
    { status: 503 }
  );
}

// Resolve Neon Auth on each request and forward the Next.js route context.
async function forward(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  request: Request,
  context: AuthRouteContext
) {
  const handlers = getNeonAuth()?.handler();
  const handler = handlers?.[method];
  return handler ? handler(request, context) : unavailable();
}

export async function GET(request: Request, context: AuthRouteContext) {
  return forward("GET", request, context);
}

export async function POST(request: Request, context: AuthRouteContext) {
  return forward("POST", request, context);
}

export async function PUT(request: Request, context: AuthRouteContext) {
  return forward("PUT", request, context);
}

export async function PATCH(request: Request, context: AuthRouteContext) {
  return forward("PATCH", request, context);
}

export async function DELETE(request: Request, context: AuthRouteContext) {
  return forward("DELETE", request, context);
}
