import { NextResponse } from "next/server";
import { withBasePath } from "@/lib/hosting/base-path";
import {
  getExportErrorContent,
  resolveExportErrorCode,
} from "./export-error-content";
import { resolveSupportReference } from "./support-reference";
import {
  EXPORT_RETRY_COOKIE,
  EXPORT_RETRY_COOKIE_MAX_AGE_SECONDS,
  EXPORT_RETRY_COOKIE_PATH,
  parseExportRetryTarget,
} from "./export-retry-target";

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
 * nothing from it is forwarded: the target is built from scratch.
 *
 * The `Location` is deliberately relative. Behind a reverse proxy - Azure Static
 * Web Apps, a load balancer, any container platform - `req.url` is the *internal*
 * origin the Node process was reached on (`http://<container-id>:8080`), not the
 * address the visitor typed. Redirecting there sends the browser somewhere it
 * cannot resolve. A relative Location (RFC 7231 §7.1.2) sidesteps the question:
 * the browser resolves it against the URL it actually requested, so this is
 * correct on every host without trusting forwarded headers or configuring an
 * origin. Do not "fix" this into an absolute URL.
 */
export async function asBrowserExportError(
  response: NextResponse,
  acceptHeader: string | null,
  /**
   * The relative export path the request came in on. Stored in an `HttpOnly`
   * cookie - never in the redirect URL - so the error page can offer a retry
   * without the access token being visible anywhere. Omit it and no retry is
   * offered; it is only written for codes that actually use it.
   */
  retryTarget?: string,
): Promise<NextResponse> {
  if (!prefersHtml(acceptHeader)) {
    return response;
  }

  let errorCode: string | undefined;
  let apiTraceId: string | undefined;
  try {
    const body = (await response.clone().json()) as {
      errorCode?: string;
      traceId?: string;
    };
    errorCode = body.errorCode;
    apiTraceId = body.traceId;
  } catch {
    // Not problem-details JSON; the status alone still resolves a code.
  }

  const code = resolveExportErrorCode(response.status, errorCode);

  // A correlation id the reader can quote. Not a secret, unlike the token.
  const reference = resolveSupportReference(apiTraceId);

  const query = new URLSearchParams({ code });
  if (reference) {
    query.set("ref", reference);
  }

  const target = `${withBasePath(EXPORT_ERROR_PATH)}?${query.toString()}`;

  // Built by hand: NextResponse.redirect() rejects a relative target.
  const redirect = new NextResponse(null, {
    status: 303,
    headers: {
      Location: target,
      "Cache-Control": "no-store",
    },
  });

  // Store the token-bearing link only when the page will actually use it, so a
  // failure that cannot be retried never puts the token in a cookie at all.
  const safeRetryTarget = getExportErrorContent(code).offersRetry
    ? parseExportRetryTarget(retryTarget)
    : null;

  if (safeRetryTarget) {
    redirect.cookies.set({
      name: EXPORT_RETRY_COOKIE,
      value: safeRetryTarget,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: EXPORT_RETRY_COOKIE_PATH,
      maxAge: EXPORT_RETRY_COOKIE_MAX_AGE_SECONDS,
    });
  }

  return redirect;
}
