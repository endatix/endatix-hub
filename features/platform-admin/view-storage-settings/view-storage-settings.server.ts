import "server-only";

import { getStorageAdminSummary } from "@/features/asset-storage/use-cases/view-settings-summary/storage-admin-summary";
import type { PlatformAdminSession } from "../types";

export async function getStorageSettings(_session: PlatformAdminSession) {
  return getStorageAdminSummary();
}
