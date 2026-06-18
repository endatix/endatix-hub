import { StorageProviderSummaryCard } from "./storage-provider-summary-card";
import type { StorageAdminSummary } from "@/features/asset-storage/use-cases/view-settings-summary/storage-admin-summary";

interface StorageSettingsPanelProps {
  summary: StorageAdminSummary;
}

export function StorageSettingsPanel({
  summary,
}: Readonly<StorageSettingsPanelProps>) {
  return <StorageProviderSummaryCard summary={summary} />;
}
