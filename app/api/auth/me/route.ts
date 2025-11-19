import { NextResponse } from "next/server";
import { authorization } from "@/features/auth/authorization";
import {
  AuthorizationErrorType,
  AuthorizationResult,
  GetAuthDataResult,
} from "@/features/auth";
import { setResponseCachingHeaders } from "@/lib/utils/route-handlers";

export const dynamic = "force-dynamic";

/**
 * API endpoint that returns user permissions
 */
export async function GET() {
  try {
    const { getAuthorizationData } = await authorization();
    const getAuthDataResult = await getAuthorizationData();

    if (AuthorizationResult.isError(getAuthDataResult)) {
      return toHttpError(getAuthDataResult);
    }

    const authorizationData = getAuthDataResult.data;
    const response = NextResponse.json(authorizationData);

    setResponseCachingHeaders(response, {
      storeMode: "browserOnly",
      etag: authorizationData.eTag,
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function toHttpError(result: GetAuthDataResult): NextResponse {
  if (result.success) {
    throw new Error("Cannot convert success result to HTTP error");
  }

  let statusCode = 500;
  let errorMessage = "Unknown error";

  switch (result.error.type) {
    case AuthorizationErrorType.AuthenticationRequired:
      statusCode = 401;
      errorMessage = result.error.message;
      break;
    case AuthorizationErrorType.AccessDenied:
      statusCode = 403;
      errorMessage = result.error.message;
      break;
    case AuthorizationErrorType.ServerError:
      statusCode = 500;
      errorMessage = result.error.message;
      break;
    default:
      break;
  }

  return NextResponse.json({ error: errorMessage }, { status: statusCode });
}
