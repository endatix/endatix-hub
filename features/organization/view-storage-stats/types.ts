import { ApiResult } from "@/lib/endatix-api";
import { StorageDashboardData } from "@/lib/endatix-api/stats";

type StorageStatsPromise = Promise<ApiResult<StorageDashboardData>>;

export type { StorageStatsPromise };
