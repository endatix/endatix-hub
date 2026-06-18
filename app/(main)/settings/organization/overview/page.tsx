import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Loader2 } from "lucide-react";
import { auth } from "@/auth";
import { authorization, Permissions } from "@/features/auth/authorization";
import { UnauthorizedComponent } from "@/components/error-handling/unauthorized";
import { EndatixApi } from "@/lib/endatix-api";
import { storageStatsFlag } from "@/lib/feature-flags/flags";
import { StorageDashboard } from "@/features/organization/view-storage-stats";

export const metadata = {
  title: "Organization Overview | Settings",
  description:
    "Review organization usage across top forms, submissions, and storage.",
};

export default async function OrganizationOverviewPage() {
  const isEnabled = await storageStatsFlag();
  if (!isEnabled) {
    notFound();
  }

  const session = await auth();
  const { requireHubAccess, checkPermission } = await authorization(session);
  await requireHubAccess();

  const canViewSettings = (
    await checkPermission(Permissions.Tenant.ViewSettings)
  ).success;
  if (!canViewSettings) {
    return <UnauthorizedComponent variant="card" />;
  }

  const api = new EndatixApi(session?.accessToken);
  const storageStatsPromise = api.stats.getStorageStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Review organization usage across top forms, submissions, and storage.
        </p>
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
