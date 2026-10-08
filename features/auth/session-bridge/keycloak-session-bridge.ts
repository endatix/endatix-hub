import type { CookieOption } from "@auth/core/types";
import { NextRequest, NextResponse } from "next/server";
import { AuthTokenSchema, KeycloakTokenResponse } from "./types";
import {
  getSessionCookieOptions,
  sessionCookieChunks,
  shouldUseSecureSessionCookie,
} from "../infrastructure/session-utils";
import { decodeJwt, type JWTPayload } from "jose";
import { apiResponses } from "@/lib/utils/route-handlers";
import { encode } from "next-auth/jwt";
import { flattenFieldErrors, parseZodError } from "@/lib/utils/zod-error-utils";
import { authConfig } from "@/auth";
import { KEYCLOAK_ID } from "../infrastructure/providers";
import { invalidateUserAuthorizationCache } from "../authorization/application/authorization-data.provider";

const SERVER_ERROR_TITLE = "Session bridge server error";

export async function createSessionFromToken(
  tokenData: KeycloakTokenResponse,
  request: NextRequest,
) {
  try {
    const useSecureCookies = shouldUseSecureSessionCookie(request.headers);
    const sessionCookieOptions = getSessionCookieOptions(useSecureCookies);
    const userInfo = decodeJwt(tokenData.id_token);

    if (!userInfo) {
      return apiResponses.badRequest({
        errorCode: "MISSING_ID_TOKEN",
        detail:
          "Session bridge failed. The token exchange response does not contain an ID token.",
      });
    }

    const validatedAuthTokenResult = AuthTokenSchema.safeParse(
      toAuthTokenPayload(tokenData, userInfo),
    );

    if (!validatedAuthTokenResult.success) {
      const parsedAuthTokenErrors = parseZodError(
        validatedAuthTokenResult.error,
      );
      return apiResponses.badRequest({
        errorCode: "EXCHANGED_TOKEN_INVALID",
        detail:
          "Session bridge token exchange failed. Insufficient information to establish a session.",
        fields: flattenFieldErrors(parsedAuthTokenErrors.fields),
      });
    }

    const token = validatedAuthTokenResult.data;
    const sessionCookieName =
      sessionCookieOptions.sessionToken.name || "authjs.session-token";
    const jwt = await encode({
      token: token,
      secret: authConfig.secret!,
      salt: sessionCookieName,
    });

    invalidateUserAuthorizationCache({ userId: token.id });

    // 5. Create session cookies
    const response = NextResponse.json({
      success: true,
      user: {
        id: userInfo.sub,
        name: userInfo.name,
        email: userInfo.email,
        image: userInfo.picture,
      },
    });

    setSessionCookie(request, response, {
      name: sessionCookieName,
      value: jwt,
      options: sessionCookieOptions.sessionToken.options,
    });

    return response;
  } catch (error) {
    console.error(`${SERVER_ERROR_TITLE}:`, error);
    return apiResponses.serverError({
      title: SERVER_ERROR_TITLE,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

function toAuthTokenPayload(
  tokenData: KeycloakTokenResponse,
  userInfo: JWTPayload,
) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  return {
    id: userInfo.sub ?? userInfo.id,
    email: userInfo.email,
    name: userInfo.name ?? userInfo.nickname ?? userInfo.preferred_username,
    picture: userInfo.picture,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    // Kept for Keycloak federated logout (id_token_hint).
    id_token: tokenData.id_token,
    provider: KEYCLOAK_ID,
    iat: nowSeconds,
    // Epoch seconds, like a regular sign-in, so the jwt callback can expire it.
    expires_at: nowSeconds + tokenData.expires_in,
  };
}

/**
 * Writes the session token in Auth.js chunks. Auth.js joins every cookie whose
 * name starts with the session cookie name, so leftovers from an earlier
 * session are expired.
 */
function setSessionCookie(
  request: NextRequest,
  response: NextResponse,
  cookie: { name: string; value: string; options?: CookieOption["options"] },
): void {
  const chunks = sessionCookieChunks(cookie.name, cookie.value);
  const written = new Set(chunks.map((chunk) => chunk.name));
  for (const chunk of chunks) {
    response.cookies.set(chunk.name, chunk.value, cookie.options);
  }
  for (const { name } of request.cookies.getAll()) {
    if (name.startsWith(cookie.name) && !written.has(name)) {
      response.cookies.set(name, "", { ...cookie.options, maxAge: 0 });
    }
  }
}
