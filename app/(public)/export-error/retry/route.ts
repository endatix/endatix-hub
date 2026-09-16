import { NextRequest, NextResponse } from "next/server";
import { withBasePath } from "@/lib/hosting/base-path";
import {
  EXPORT_RETRY_COOKIE,
  EXPORT_RETRY_COOKIE_PATH,
  parseExportRetryTarget,
} from "@/features/pdf-export/export-retry-target";

/**
 * Retries a failed export using the link stored at redirect time.
 *
 * A POST, not a link, so the token never appears in the page's HTML: the
 * browser only ever learns the export URL as a redirect target. The stored
 * value is re-validated here rather than trusted - the cookie is unsigned, so
 * this is the boundary that keeps a forged one from redirecting off-site.
 */
export async function POST(req: NextRequest) {
  const stored = req.cookies.get(EXPORT_RETRY_COOKIE)?.value;
  const target = parseExportRetryTarget(stored);

  const location =
    target ?? `${withBasePath("/export-error")}?code=unknown`;

  const redirect = new NextResponse(null, {
    status: 303,
    headers: { Location: location, "Cache-Control": "no-store" },
  });

  // One retry per stored link: a fresh failure writes a fresh cookie, so a
  // stale token is never left sitting in the browser.
  redirect.cookies.set({
    name: EXPORT_RETRY_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: EXPORT_RETRY_COOKIE_PATH,
    maxAge: 0,
  });

  return redirect;
}
