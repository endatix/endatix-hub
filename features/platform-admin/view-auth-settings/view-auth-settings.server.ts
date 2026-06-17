import { EndatixApi, ApiResult } from "@/lib/endatix-api";
import type { AuthSettings } from "@/lib/endatix-api/auth-admin/types";
import { getAuthSettingsDriftHints } from "@/features/auth/use-cases/view-settings-summary/auth-settings-drift";
import type { AuthSettingsDriftHint } from "@/features/auth/use-cases/view-settings-summary/auth-settings-drift";
import { getHubAuthAdminSummary } from "@/features/auth/use-cases/view-settings-summary/hub-auth-admin-summary";
import type { HubAuthAdminSummary } from "@/features/auth/use-cases/view-settings-summary/hub-auth-admin-summary";
import { KEYCLOAK_ID } from "@/features/auth/infrastructure/providers/keycloak-auth-provider";
import { requirePlatformAdmin } from "../server";

export type AuthAdminSummary = {
  api: AuthSettings | null;
  hub: HubAuthAdminSummary;
  driftHints: AuthSettingsDriftHint[];
};

export async function getAuthSettings(): Promise<AuthAdminSummary> {
  const session = await requirePlatformAdmin();
  const hub = getHubAuthAdminSummary();
  const api = new EndatixApi(session?.accessToken);
  const apiResult = await api.authAdmin.getSettings();

  const apiSettings: AuthSettings | null = ApiResult.isSuccess(apiResult)
    ? apiResult.data
    : null;

  const apiKeycloak = apiSettings?.providers.find(
    (provider) => provider.providerId === "Keycloak",
  );
  const hubKeycloak = hub.providers.find(
    (provider) => provider.id === KEYCLOAK_ID,
  );

  const driftHints = getAuthSettingsDriftHints(
    apiKeycloak?.issuer,
    hubKeycloak?.issuer,
    apiKeycloak?.isEnabled ?? false,
    hubKeycloak?.isActive ?? false,
  );

  return {
    api: apiSettings,
    hub,
    driftHints,
  };
}
