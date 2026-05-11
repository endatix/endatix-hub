import { NextRequest, NextResponse } from "next/server";
import { getMaintenanceRetryAfterSeconds } from "./maintenance-config";

/**
 * Rewrites eligible requests to `/maintenance` with 503 and optional `Retry-After`.
 * API routes should be excluded from the middleware matcher — see `proxy.ts` config.
 */
export function rewriteToMaintenance(req: NextRequest): NextResponse {
  const url = req.nextUrl.clone();
  url.pathname = "/maintenance";
  url.search = "";

  const retryAfter = getMaintenanceRetryAfterSeconds();
  const headers = new Headers();
  if (retryAfter !== undefined) {
    headers.set("Retry-After", String(retryAfter));
  }

  return NextResponse.rewrite(url, {
    status: 503,
    headers,
  });
}
