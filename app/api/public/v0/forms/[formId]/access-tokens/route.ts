import { auth } from "@/auth";
import { EndatixApi } from "@/lib/endatix-api/endatix-api";
import type { CreateFormAccessTokenRequest } from "@/lib/endatix-api/forms/types";
import {
  apiResponses,
  setResponseCachingHeaders,
  toNextResponse,
} from "@/lib/utils/route-handlers";

/**
 * Creates a form access JWT on the Endatix API using the Hub session (httpOnly cookie) so the browser never sends the user access token to the API origin.
 * Anonymous share flows work with the optional JSON body for legacy tokens.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ formId: string }> },
): Promise<Response> {
  const { formId } = await context.params;
  if (!formId) {
    return apiResponses.badRequest({ detail: "Form ID is required" });
  }

  let body: CreateFormAccessTokenRequest = {};
  try {
    const text = await request.text();
    if (text.length > 0) {
      body = JSON.parse(text) as CreateFormAccessTokenRequest;
    }
  } catch {
    return apiResponses.badRequest({ detail: "Invalid JSON body" });
  }

  const session = await auth();
  const endatixApi = new EndatixApi(session?.accessToken);

  const result = await endatixApi.forms.createFormAccessToken(formId, body);

  const response = toNextResponse(result);
  setResponseCachingHeaders(response, { storeMode: "noStore" });
  
  return response;
}
