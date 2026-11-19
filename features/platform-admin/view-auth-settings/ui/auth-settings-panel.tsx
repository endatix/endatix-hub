import { AuthProviderSummaryCard } from "./auth-provider-summary-card";
import type { AuthAdminSummary } from "../view-auth-settings.server";

interface AuthSettingsPanelProps {
  summary: AuthAdminSummary;
  productName: string;
}

export function AuthSettingsPanel({
  summary,
  productName,
}: Readonly<AuthSettingsPanelProps>) {
  return (
    <AuthProviderSummaryCard summary={summary} productName={productName} />
  );
}
