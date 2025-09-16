// app/api/auth/token-exchange/route.ts
import { NextRequest, NextResponse } from "next/server";
import { encode } from "@auth/core/jwt";
import { authConfig } from "@/auth";
import { Auth } from '@auth/core';

const KEYCLOAK_JWT_TOKEN = {
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJESWZFbkRObVoxUk8zeXQwVS1yOTdvVS16dFBvaDJsdVA0S1N4a080dHRrIn0.eyJleHAiOjE3NTgwMTY2NjEsImlhdCI6MTc1ODAxNjM2MSwianRpIjoib25ydHRlOjA3NDBjOTU0LTIxZWItMTNiMi1jZWIyLTNlMTM4ZDI0OGRmNiIsImlzcyI6Imh0dHA6Ly9sb2NhbGhvc3Q6ODA4MC9yZWFsbXMvZW5kYXRpeCIsImF1ZCI6ImVuZGF0aXgtaHViIiwic3ViIjoiMGY2ZDhiMjgtZTc2MS00MDMzLThlODQtMmRkZWJjZWM0OWNlIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoiZW5kYXRpeC1odWIiLCJzaWQiOiI1YWQ5Y2IxYy02NTQ3LTRlNWYtOWRlZi1kNTg2NGViNTYzY2MiLCJhY3IiOiIxIiwiYWxsb3dlZC1vcmlnaW5zIjpbImh0dHA6Ly9sb2NhbGhvc3Q6MzAwMCJdLCJyZXNvdXJjZV9hY2Nlc3MiOnsiZW5kYXRpeC1odWIiOnsicm9sZXMiOlsicGFuZWxpc3QiXX19LCJzY29wZSI6Im9wZW5pZCBlbWFpbCBwcm9maWxlIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJFeHRlcm5hbCBVc2VyIiwicHJlZmVycmVkX3VzZXJuYW1lIjoiZXh0ZXJuYWxAZW5kYXRpeC5jb20iLCJnaXZlbl9uYW1lIjoiRXh0ZXJuYWwiLCJmYW1pbHlfbmFtZSI6IlVzZXIiLCJlbWFpbCI6ImV4dGVybmFsQGVuZGF0aXguY29tIn0.D5p3V9pZX2gBtUdE7CRTiQjYt82XDizDaE4Yk7rWBpqOVYvCi5rb_ZEaP-tVv5Vo8kHIhA7Il4aJ7nACj7JNT3_G42-XbxZxoiHYlbtCLD0Mn4kqXZB2_coYerBf63CBM7vK464oZp8OP5SAW-8FoNpkqacjjU74kWw_0SmTSqtkjZUeNh8ed65yCw_cluMe1nB06zlcCm11zdlzJo_EcN-vLI5ZLNL7dqT03FixQA1d5ObfTyqFRHgdlwkDTdhbyGeYL5O3_TeDKAn1efOBAXk491EHympJO9WAJuZD5rOL6f-1eddXTQfyLkus7VSAKORaSlWkqqkDkM0arn4GaA",
  "expires_in": 300,
  "refresh_expires_in": 1800,
  "refresh_token": "eyJhbGciOiJIUzUxMiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIwM2RhZDFkMC1kMTA3LTRkZGEtYTVhOC01NzU1NzZiNWQ2MDUifQ.eyJleHAiOjE3NTgwMTgxNjEsImlhdCI6MTc1ODAxNjM2MSwianRpIjoiODQ3MmE3NjktMTQyNS1hZTZiLTM0ZGMtM2U3ZTIyYmNlODQwIiwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwL3JlYWxtcy9lbmRhdGl4IiwiYXVkIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwL3JlYWxtcy9lbmRhdGl4Iiwic3ViIjoiMGY2ZDhiMjgtZTc2MS00MDMzLThlODQtMmRkZWJjZWM0OWNlIiwidHlwIjoiUmVmcmVzaCIsImF6cCI6ImVuZGF0aXgtaHViIiwic2lkIjoiNWFkOWNiMWMtNjU0Ny00ZTVmLTlkZWYtZDU4NjRlYjU2M2NjIiwic2NvcGUiOiJvcGVuaWQgYWNyIGVtYWlsIGJhc2ljIHdlYi1vcmlnaW5zIHJvbGVzIHByb2ZpbGUifQ.rSuYMOl6ea7zspRWNtmud1rUUQb6UgG9akJHXMp46gGKDztAsA-q0OVfjL1M89TitJMdjORAPx3bGVbRYdiDGg",
  "token_type": "Bearer",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJESWZFbkRObVoxUk8zeXQwVS1yOTdvVS16dFBvaDJsdVA0S1N4a080dHRrIn0.eyJleHAiOjE3NTgwMTY2NjEsImlhdCI6MTc1ODAxNjM2MSwianRpIjoiYTNjYWExYjUtNDIyYy04OTRkLWIyOTktNjQwYmZhYmU4MDQ3IiwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwL3JlYWxtcy9lbmRhdGl4IiwiYXVkIjoiZW5kYXRpeC1odWIiLCJzdWIiOiIwZjZkOGIyOC1lNzYxLTQwMzMtOGU4NC0yZGRlYmNlYzQ5Y2UiLCJ0eXAiOiJJRCIsImF6cCI6ImVuZGF0aXgtaHViIiwic2lkIjoiNWFkOWNiMWMtNjU0Ny00ZTVmLTlkZWYtZDU4NjRlYjU2M2NjIiwiYXRfaGFzaCI6ImdOYWtYUGkzRF9BUkhFajM1aWxOZEEiLCJhY3IiOiIxIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJFeHRlcm5hbCBVc2VyIiwicHJlZmVycmVkX3VzZXJuYW1lIjoiZXh0ZXJuYWxAZW5kYXRpeC5jb20iLCJnaXZlbl9uYW1lIjoiRXh0ZXJuYWwiLCJmYW1pbHlfbmFtZSI6IlVzZXIiLCJlbWFpbCI6ImV4dGVybmFsQGVuZGF0aXguY29tIn0.hVabIN_CXwafHzWSPGr1iWKIfiZyNtu66YuM8cgmJjC1hpqStvIfne0wiw-W2ZOYWHjZTktbIyGe1ResOeznrzT7miR_kXIWnbO8-UcCMQmMgFoAyrankRzMTAGiQx-mJnG4F4K6f_4kz0IDNx38xw4xe3SyP6wcTWkj2ZYUegAhKaYIKld89sCqrOKcm-yN8sc_5H5CXdEgDkbXdPsTnouFpEV42exVoqJ_azsfd_XV7ao0C41aVggi_9c6qXdJkMUg8i6PukaHvWHWNFEOJwvNHBuSh9Fv1R8AhPWzUp5qM7rSfZ4DFUPHaXmKEgWCX4WbZ1sYs5Ucr7FuVVxFUg",
  "not-before-policy": 0,
  "session_state": "5ad9cb1c-6547-4e5f-9def-d5864eb563cc",
  "scope": "openid email profile",
  "issued_token_type": "urn:ietf:params:oauth:token-type:refresh_token"
};

interface KeycloakTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  id_token: string;
  session_state: string;
  scope: string;
}

interface KeycloakUserInfo {
  sub: string;
  name: string;
  email: string;
  preferred_username: string;
  given_name: string;
  family_name: string;
  email_verified: boolean;
  picture?: string;
}

export async function GET(request: NextRequest) {
  try {
    // const { mobileJWT } = await request.json();

    // if (!mobileJWT) {
    //   return NextResponse.json(
    //     { error: "Mobile JWT required" },
    //     { status: 400 },
    //   );
    // }

    // // 1. Exchange mobile JWT for Keycloak tokens
    // const keycloakResponse = await exchangeMobileJWTForKeycloakTokens(
    //   mobileJWT,
    // );

    const keycloakResponse = KEYCLOAK_JWT_TOKEN;
    // 2. Get user info from Keycloak
    const userInfo = await getUserInfoFromKeycloak(
      keycloakResponse.access_token,
    );

    // 3. Create a mock callback request to trigger Auth.js session creation
    const mockCallbackRequest = createMockCallbackRequest(
      keycloakResponse,
      userInfo,
    );

    // 4. Use Auth.js to process the callback and create session
    const authResponse = await Auth(mockCallbackRequest, authConfig);

    // 5. Extract cookies from Auth.js response
    const response = NextResponse.json({
      success: true,
      user: {
        name: userInfo.name,
        email: userInfo.email,
        image: userInfo.picture,
      },
    });

    // Copy cookies from Auth.js response to our response
    if (authResponse instanceof Response) {
      const setCookieHeaders = authResponse.headers.getSetCookie();
      setCookieHeaders.forEach((cookie) => {
        response.headers.append("Set-Cookie", cookie);
      });
    }

    return response;
  } catch (error) {
    console.error("Token exchange error:", error);
    return NextResponse.json(
      { error: "Token exchange failed" },
      { status: 500 },
    );
  }
}

async function exchangeMobileJWTForKeycloakTokens(
  mobileJWT: string,
): Promise<KeycloakTokenResponse> {
  const keycloakTokenUrl = `${process.env.KEYCLOAK_ISSUER}/protocol/openid-connect/token`;

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
      audience: process.env.KEYCLOAK_CLIENT_ID!,
    }),
  });

  if (!response.ok) {
    throw new Error(`Keycloak token exchange failed: ${response.statusText}`);
  }

  return response.json();
}

async function getUserInfoFromKeycloak(
  accessToken: string,
): Promise<KeycloakUserInfo> {
  const userInfoUrl = `${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/userinfo`;

  const response = await fetch(userInfoUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.statusText}`);
  }

  return response.json();
}

function createMockCallbackRequest(
  keycloakTokens: KeycloakTokenResponse,
  userInfo: KeycloakUserInfo,
): Request {
  // Create a mock callback URL with the necessary parameters
  const callbackUrl = new URL(
    "/api/auth/callback/keycloak",
    process.env.NEXTAUTH_URL || "http://localhost:3000",
  );

  // Add the authorization code and state parameters that Auth.js expects
  callbackUrl.searchParams.set("code", "mock_code"); // Auth.js will validate this
  callbackUrl.searchParams.set("state", "mock_state"); // Auth.js will validate this

  // Create a mock request that simulates the OAuth callback
  const mockRequest = new Request(callbackUrl.toString(), {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Cookie: "", // Empty cookies for now
    },
  });

  return mockRequest;
}
