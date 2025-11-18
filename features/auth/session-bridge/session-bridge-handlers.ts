import { NextRequest, NextResponse } from "next/server";
import { KEYCLOAK_ID } from "@/features/auth/infrastructure/providers/keycloak-auth-provider";
import { authRegistry } from "@/features/auth/infrastructure/auth-provider-registry";
import { experimentalFeaturesFlag } from "@/lib/feature-flags";
import { exchangeKeycloakToken } from "@/features/auth/session-bridge/keycloak-token-exchange";
import { apiResponses, toNextResponse } from "@/lib/utils/route-handlers";
import { ApiResult } from "@/lib/endatix-api";
import { createSessionFromToken } from "@/features/auth/session-bridge/keycloak-session-bridge";
import { SessionBridgeRequestSchema } from "./types";

const SERVER_ERROR_TITLE = "Session bridge server error";

/**
 * A handler for the session bridge endpoint.
 * @param request - The request object.
 * @returns The response object.
 */
export async function sessionBridgeHandler(
  request: NextRequest,
): Promise<NextResponse> {
  const enableExperimental = await experimentalFeaturesFlag();
  const allowSessionBridge =
    enableExperimental || process.env.NODE_ENV !== "production";

  if (!allowSessionBridge) {
    return apiResponses.forbidden({
      detail: "Session bridge is not allowed",
    });
  }

  // Hard-wired to Keycloak for now
  const providerId = KEYCLOAK_ID;

  try {
    const body = await request.json();
    const parsedRequestResult = SessionBridgeRequestSchema.safeParse(body);

    if (!parsedRequestResult.success) {
      return apiResponses.badRequest({
        detail: "Missing access_token. Please provide a valid access token.",
      });
    }

    const accessToken = parsedRequestResult.data.access_token;

    const authProvider = authRegistry.getProvider(providerId);
    if (!authProvider) {
      return apiResponses.serverError({
        title: SERVER_ERROR_TITLE,
        detail: `Missing required auth provider. Please contact support.`,
      });
    }

    const exchangeKeycloakTokenResult = await exchangeKeycloakToken(
      accessToken,
    );
    if (ApiResult.isError(exchangeKeycloakTokenResult)) {
      return toNextResponse(exchangeKeycloakTokenResult);
    }

    const sessionResponse = await createSessionFromToken(
      exchangeKeycloakTokenResult.data,
      request,
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

/**
 * A record of session bridge handlers for the Next.js route handlers.
 */
export type SessionBridgeHandlers = Record<
  "POST",
  (req: NextRequest) => Promise<NextResponse>
>;
