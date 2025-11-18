import { ApiResult, ERROR_CODE } from "@/lib/endatix-api";
import zod from "zod";

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

export async function exchangeKeycloakToken(
  mobileJWT: string,
): Promise<ApiResult<KeycloakTokenResponse>> {
  const keycloakTokenUrl = `${process.env.AUTH_KEYCLOAK_ISSUER}/protocol/openid-connect/token`;

  if (!mobileJWT) {
    return ApiResult.validationError(
      "Mobile JWT is required",
      ERROR_CODE.VALIDATION_ERROR,
      {
        details: "Mobile JWT is required",
      },
    );
  }

  const tokenExchangeBody = {
    grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
    client_id: process.env.AUTH_KEYCLOAK_CLIENT_ID!,
    client_secret: process.env.AUTH_KEYCLOAK_CLIENT_SECRET!,
    subject_token: mobileJWT,
    subject_token_type: "urn:ietf:params:oauth:token-type:access_token",
    requested_token_type: "urn:ietf:params:oauth:token-type:refresh_token",
    audience: process.env.AUTH_KEYCLOAK_CLIENT_ID!,
    scope: "email openid profile",
  };

  try {
    const response = await fetch(keycloakTokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams(tokenExchangeBody),
    });

    if (!response.ok) {
      const error = await response.json();
      if (response.status === 400) {
        return ApiResult.validationError(
          "Token exchange failed",
          ERROR_CODE.VALIDATION_ERROR,
          {
            details: error?.error_description ?? JSON.stringify(error),
          },
        );
      } else {
        return ApiResult.serverError("Keycloak token exchange failed", {
          details: JSON.stringify(error),
        });
      }
    }

    const keycloakTokenData = await response.json();
    const keycloakTokenDataResult =
      KeycloakTokenResponseSchema.safeParse(keycloakTokenData);

    if (!keycloakTokenDataResult.success) {
      return ApiResult.validationError(
        "Invalid Keycloak token format",
        ERROR_CODE.VALIDATION_ERROR,
        {
          details: JSON.stringify(
            keycloakTokenDataResult?.error?.flatten() || [],
          ),
        },
      );
    }

    return ApiResult.success(keycloakTokenData);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error) ?? "Unknown error";

    if (errorMessage.includes("fetch failed")) {
      return ApiResult.networkError(
        "Network error. Failed to connect to the Keycloak token exchange endpoint.",
        {
          details: errorMessage,
        },
      );
    } else {
      return ApiResult.serverError("Keycloak token exchange failed", {
        details: errorMessage,
      });
    }
  }
}
