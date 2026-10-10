import { FormTokenCookieStore } from "@/features/public-form/infrastructure/cookie-store";
import { EndatixApi } from "@/lib/endatix-api";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ formId: string; token: string }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { formId, token } = await params;
  const redeemed = await new EndatixApi().audience.redeemLink(formId, token);
  if (!redeemed.success) {
    return new NextResponse(redeemed.error.message, { status: 404 });
  }

  const store = new FormTokenCookieStore(await cookies());
  store.setToken({ formId, token: redeemed.data.accessToken });
  return NextResponse.redirect(new URL(`/share/${formId}`, request.url));
}
