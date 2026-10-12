import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import { EndatixApi } from "@/lib/endatix-api";
import {
  isNotFoundError,
  isValidationError,
} from "@/lib/endatix-api/shared/api-result";
import { withBasePath } from "@/lib/hosting";
import { Result } from "@/lib/result";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ formId: string; token: string }> };

const NO_STORE = { "Cache-Control": "no-store" };
const NOT_FOUND = "This link is not valid.";
const UNAVAILABLE = "The link could not be opened. Try again.";

function text(body: string, status: number): NextResponse {
  return new NextResponse(body, { status, headers: NO_STORE });
}

export async function GET(request: Request, { params }: RouteParams) {
  const { formId, token } = await params;
  const redeemed = await new EndatixApi().audience.redeemLink(formId, token);
  if (!redeemed.success) {
    const missing = isNotFoundError(redeemed) || isValidationError(redeemed);
    return text(missing ? NOT_FOUND : UNAVAILABLE, missing ? 404 : 503);
  }

  const store = new FormTokenCookieStore(await cookies());
  const stored = store.setToken({ formId, token: redeemed.data.accessToken });
  if (Result.isError(stored)) return text(UNAVAILABLE, 503);

  const response = NextResponse.redirect(
    new URL(withBasePath(`/share/${formId}`), request.url),
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
