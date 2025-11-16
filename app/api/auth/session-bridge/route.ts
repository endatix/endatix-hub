import { NextRequest, NextResponse } from "next/server";
import { encode } from "@auth/core/jwt";
import { authConfig } from "@/auth";
import { KEYCLOAK_ID } from "@/features/auth/infrastructure/providers/keycloak-auth-provider";
import { authRegistry } from "@/features/auth/infrastructure/auth-provider-registry";
import { decodeJwt } from "jose";
import zod from "zod";
import { getSessionCookieOptions } from "@/features/auth/infrastructure/session-utils";
import { experimentalFeaturesFlag } from "@/lib/feature-flags";
import { invalidateUserAuthorizationCache } from "@/features/auth/authorization/application/authorization-data.provider";

const MobileJwtTokenSchema = zod.object({
  access_token: zod.string(),
});

export type MobileJwtToken = zod.infer<typeof MobileJwtTokenSchema>;

const KeycloakTokenResponseSchema = zod.object({
  access_token: zod.string(),
  refresh_token: zod.string(),
  expires_in: zod.number(),
  refresh_expires_in: zod.number(),
  id_token: zod.string(),
  token_type: zod.string(),
  scope: zod.string(),
  session_state: zod.string(),
  issued_token_type: zod.string(),
});

export type KeycloakTokenResponse = zod.infer<
  typeof KeycloakTokenResponseSchema
>;

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
    return NextResponse.json(
      { error: "Session bridge is not allowed" },
      { status: 403 },
    );
  }

  const providerId = KEYCLOAK_ID;

  try {
    const body = await request.json();
    const mobileJwtResult = MobileJwtTokenSchema.safeParse(body);

    if (!mobileJwtResult.success) {
      return NextResponse.json(
        { error: "Invalid mobile JWT token format" },
        { status: 400 },
      );
    }

    const mobileJwt = mobileJwtResult.data.access_token;

    const authProvider = authRegistry.getProvider(providerId);
    if (!authProvider) {
      return NextResponse.json(
        { error: "Requested auth provider not found" },
        { status: 500 },
      );
    }

    const keycloakTokenData = await exchangeToken(mobileJwt);
    const keycloakTokenDataResult =
      KeycloakTokenResponseSchema.safeParse(keycloakTokenData);
    if (!keycloakTokenDataResult.success) {
      return NextResponse.json(
        {
          error: "Invalid Keycloak token format",
          details: JSON.stringify(
            keycloakTokenDataResult?.error?.flatten() || [],
          ),
        },
        { status: 400 },
      );
    }

    const sessionResponse = await createSessionFromTokenData(
      keycloakTokenDataResult.data,
      request.nextUrl.protocol,
    );
    return sessionResponse;
  } catch (error) {
    console.error("Session bridge error:", error);
    return NextResponse.json(
      {
        error: "Session creation failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

async function createSessionFromTokenData(
  tokenData: KeycloakTokenResponse,
  protocol: string,
) {
  const useSecureCookies = protocol === "https:";
  const sessionCookieOptions = getSessionCookieOptions(useSecureCookies);
  const userInfo = decodeJwt(tokenData.id_token);

  if (!userInfo) {
    return NextResponse.json(
      { error: "Invalid token format" },
      { status: 400 },
    );
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

  const validatedAuthTokenResult = AuthTokenSchema.safeParse(authTokenPayload);

  if (!validatedAuthTokenResult.success) {
    return NextResponse.json(
      { error: "Insufficient information to establish a session" },
      { status: 400 },
    );
  }

  const token = validatedAuthTokenResult.data;
  const sessionCookieName =
    sessionCookieOptions.sessionToken.name || "authjs.session-token";
  console.log("sessionCookieName", sessionCookieName);
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

  response.cookies.set(
    sessionCookieName,
    jwt,
    sessionCookieOptions.sessionToken.options,
  );

  return response;
}

async function exchangeToken(
  mobileJWT: string,
): Promise<KeycloakTokenResponse> {
  const keycloakTokenUrl = `${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/token`;

  const response = await fetch(keycloakTokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      client_id: process.env.AUTH_KEYCLOAK_CLIENT_ID!,
      client_secret: process.env.AUTH_KEYCLOAK_CLIENT_SECRET!,
      subject_token: mobileJWT,
      subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
      requested_token_type: "urn:ietf:params:oauth:token-type:refresh_token",
      audience: process.env.AUTH_KEYCLOAK_CLIENT_ID!,
      scope: "openid email profile",
    }),
  });

  if (!response.ok) {
    throw new Error(`Keycloak token exchange failed: ${response.statusText}`);
  }

  return response.json();
}
