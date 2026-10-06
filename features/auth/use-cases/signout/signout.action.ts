"use server";

import { signOut } from "@/auth";
import { getAuthJwtFromRequest } from "../../infrastructure/auth-jwt.utils";
import { resolveFederatedLogoutUrl } from "../../infrastructure/auth-logout.utils";
import { SIGNIN_PATH } from "../../infrastructure/auth-constants";
import { redirect } from "next/navigation";
import { TelemetryLogger } from "@/features/telemetry";

type ExternalRedirectUrl = `${string}:${string}`;

/**
 * Signs out the user and redirects to the federated logout URL if available, otherwise redirects to the signin page.
 */
export async function logoutAction() {
  const token = await getAuthJwtFromRequest();

  await signOut({ redirect: false });

  let federatedLogoutUrl: string | null = null;
  try {
    federatedLogoutUrl = resolveFederatedLogoutUrl(token);
  } catch (error) {
    logLogoutFailure(error);
  }

  if (federatedLogoutUrl) {
    redirect(federatedLogoutUrl as ExternalRedirectUrl);
  }

  redirect(SIGNIN_PATH);
}

function logLogoutFailure(error: unknown): void {
  TelemetryLogger.error(
    "Failed to resolve federated logout URL",
    error,
    { reason: "logout_url_failed" },
    "auth.logout",
  );
}
