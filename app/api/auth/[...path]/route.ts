import { neonAuth } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Forward all methods supported by the managed auth proxy. Some auth flows
// use PATCH/DELETE in addition to GET/POST.
export const { GET, POST, PUT, PATCH, DELETE } = neonAuth.handler();
