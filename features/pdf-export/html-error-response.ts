import { NextResponse } from "next/server";
import { withBasePath } from "@/lib/hosting/base-path";
import { resolveExportErrorCode } from "./export-error-content";

/** Where browsers are sent. A real Next.js page, not a hand-maintained file. */
const EXPORT_ERROR_PATH = "/export-error";

function prefersHtml(acceptHeader: string | null): boolean {
  if (!acceptHeader) {
    return false;
  }

  const htmlWeight = acceptHeader.includes("text/html") ? 1 : 0;
  const jsonWeight = acceptHeader.includes("application/json") ? 1 : 0;
  if (htmlWeight && !jsonWeight) {
    return true;
  }

  return (
    htmlWeight > 0 &&
    acceptHeader.indexOf("text/html") < acceptHeader.indexOf("application/json")
  );
}

/**
 * Content negotiation for public export failures.
 *
 * API clients keep the RFC7807 problem details and the real status. Browsers are
 * redirected to `/export-error`, which renders with the app's own theme and
 * components - so there is no second error page to keep in sync.
 *
 * Only a code crosses the redirect. The request URL carries an access token, so
 * nothing from it is forwarded: the redirect target is built fresh.
 */
export async function asBrowserExportError(
  response: NextResponse,
  acceptHeader: string | null,
  requestUrl: string,
): Promise<NextResponse> {
  if (!prefersHtml(acceptHeader)) {
    return response;
  }

  let errorCode: string | undefined;
  try {
    const body = (await response.clone().json()) as { errorCode?: string };
    errorCode = body.errorCode;
  } catch {
    // Not problem-details JSON; the status alone still resolves a code.
  }

  const code = resolveExportErrorCode(response.status, errorCode);
  const target = new URL(withBasePath(EXPORT_ERROR_PATH), requestUrl);
  target.search = `?code=${encodeURIComponent(code)}`;

  const redirect = NextResponse.redirect(target, 303);
  redirect.headers.set("Cache-Control", "no-store");
  return redirect;
}
