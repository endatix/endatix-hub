import { NextRequest, NextResponse } from "next/server";
import { encode } from "@auth/core/jwt";
import { authConfig } from "@/auth";
import { KEYCLOAK_ID } from "@/features/auth/infrastructure/providers/keycloak-auth-provider";
import { authRegistry } from "@/features/auth/infrastructure/auth-provider-registry";
import { decodeJwt } from "jose";
import zod from "zod";
import { getSessionCookieOptions } from "@/features/auth/infrastructure/session-utils";
import { experimentalFeaturesFlag } from "@/lib/feature-flags";
import { invalidateUserPermissionsCache } from "@/features/auth/permissions/application";
import {
  exchangeKeycloakToken,
  KeycloakTokenResponse,
} from "@/features/auth/infrastructure/session-bridge/keycloak-token-exchange";
import { apiResponses, toNextResponse } from "@/lib/utils/route-handlers";
import { ApiResult } from "@/lib/endatix-api";

const SERVER_ERROR_TITLE = "Session bridge server error";

const MobileJwtTokenSchema = zod.object({
  access_token: zod.string(),
});

export type MobileJwtToken = zod.infer<typeof MobileJwtTokenSchema>;

const AuthTokenSchema = zod.object({
  id: zod.string(),
  email: zod.string().optional(),
  name: zod.string().optional(),
  picture: zod.string().optional(),
  access_token: zod.string(),
  refresh_token: zod.string(),
  provider: zod.string(),
  iat: zod.number(),
  expires_at: zod.date(),
});

export type AuthToken = zod.infer<typeof AuthTokenSchema>;

export async function POST(request: NextRequest) {
  const enableExperimental = await experimentalFeaturesFlag();
  const allowSessionBridge =
    enableExperimental || process.env.NODE_ENV !== "production";

  if (!allowSessionBridge) {
    return apiResponses.forbidden({
      detail: "Session bridge is not allowed",
    });
  }

  const providerId = KEYCLOAK_ID;

  try {
    const body = await request.json();
    const mobileJwtResult = MobileJwtTokenSchema.safeParse(body);

    if (!mobileJwtResult.success) {
      return apiResponses.badRequest({
        detail: "Missing access token. Please provide a valid access token.",
      });
    }

    const mobileJwt = mobileJwtResult.data.access_token;

    const authProvider = authRegistry.getProvider(providerId);
    if (!authProvider) {
      return apiResponses.serverError({
        title: SERVER_ERROR_TITLE,
        detail: `Missing required auth provider. Please contact support.`,
      });
    }

    const exchangeKeycloakTokenResult = await exchangeKeycloakToken(mobileJwt);
    if (ApiResult.isError(exchangeKeycloakTokenResult)) {
      return toNextResponse(exchangeKeycloakTokenResult);
    }

    const sessionResponse = await createSessionFromTokenData(
      exchangeKeycloakTokenResult.data,
      request.nextUrl.protocol,
    );
    return sessionResponse;
  } catch (error) {
    console.error(`${SERVER_ERROR_TITLE}:`, error);
    return apiResponses.serverError({
      title: SERVER_ERROR_TITLE,
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function createSessionFromTokenData(
  tokenData: KeycloakTokenResponse,
  protocol: string,
) {
  try {
    const useSecureCookies = protocol === "https:";
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
