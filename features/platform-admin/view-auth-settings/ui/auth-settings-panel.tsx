import { AuthProviderSummaryCard } from "./auth-provider-summary-card";
import type { AuthAdminSummary } from "../view-auth-settings.server";

interface AuthSettingsPanelProps {
  summary: AuthAdminSummary;
}

export function AuthSettingsPanel({
  summary,
}: Readonly<AuthSettingsPanelProps>) {
  return <AuthProviderSummaryCard summary={summary} />;
}
