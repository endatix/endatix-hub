import { NextRequest, NextResponse } from "next/server";
import { AuthTokenSchema, KeycloakTokenResponse } from "./types";
import { getSessionCookieOptions } from "../session-utils";
import { decodeJwt } from "jose";
import { apiResponses } from "@/lib/utils/route-handlers";
import { invalidateUserPermissionsCache } from "../../permissions/application";
import { encode } from "next-auth/jwt";
import { authConfig } from "@/auth";
import { KEYCLOAK_ID } from "../providers";

const SERVER_ERROR_TITLE = "Session bridge server error";

export async function createSessionFromToken(
  tokenData: KeycloakTokenResponse,
  request: NextRequest,
) {
  try {
    const useSecureCookies = request.nextUrl.protocol === "https:";
    const sessionCookieOptions = getSessionCookieOptions(useSecureCookies);
    const userInfo = decodeJwt(tokenData.id_token);

    if (!userInfo) {
      return apiResponses.badRequest({
        errorCode: "MISSING_ID_TOKEN",
        detail:
          "Session bridge failed. The token exchange response does not contain an ID token.",
      });
    }

    const expires = new Date(Date.now() + tokenData.expires_in * 1000);
    const authTokenPayload = {
      id: userInfo.sub ?? userInfo.id,
      email: userInfo.email,
      name: userInfo.name ?? userInfo.nickname ?? userInfo.preferred_username,
      picture: userInfo.picture,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      provider: KEYCLOAK_ID,
      iat: Math.floor(Date.now() / 1000),
      expires_at: expires,
    };

    const validatedAuthTokenResult =
      AuthTokenSchema.safeParse(authTokenPayload);

    if (!validatedAuthTokenResult.success) {
      return apiResponses.badRequest({
        errorCode: "EXCHANGED_TOKEN_INVALID",
        detail:
          "Session bridge token exchange failed. Insufficient information to establish a session.",
        fields: validatedAuthTokenResult.error.flatten().fieldErrors,
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

    invalidateUserPermissionsCache({ userId: token.id });

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

    response.cookies.set(
      sessionCookieName,
      jwt,
      sessionCookieOptions.sessionToken.options,
    );

    return response;
  } catch (error) {
    console.error(`${SERVER_ERROR_TITLE}:`, error);
    return apiResponses.serverError({
      title: SERVER_ERROR_TITLE,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
