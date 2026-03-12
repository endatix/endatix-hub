import { Suspense } from "react";
import { requireAdmin } from "@/components/admin-ui/admin-protection";
import { storageStatsFlag } from "@/lib/feature-flags/flags";
import { notFound } from "next/navigation";
import { StorageDashboard } from "@/features/organization/view-storage-stats";
import { Loader2 } from "lucide-react";
import { auth } from "@/auth";
import { EndatixApi } from "@/lib/endatix-api";

export const metadata = {
  title: "Storage Stats | Admin",
  description: "View database storage usage statistics.",
};

export default async function StorageStatsPage() {
  await requireAdmin();

  const isEnabled = await storageStatsFlag();
  if (!isEnabled) {
    notFound();
  }

  const session = await auth();
  const api = new EndatixApi(session?.accessToken);
  const storageStatsPromise = api.stats.getStorageStats();

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Storage Statistics
        </h2>
      </div>
      <Suspense
        fallback={
          <div className="flex h-[400px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <StorageDashboard storageStatsPromise={storageStatsPromise} />
      </Suspense>
    </div>
  );
}
