import type { ReactNode } from "react";
import type { StorageAdminSummary } from "@/features/asset-storage/use-cases/view-settings-summary/storage-admin-summary";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HardDrive } from "lucide-react";

type StorageProviderSummaryCardProps = {
  summary: StorageAdminSummary;
};

function DetailRow({
  label,
  value,
}: Readonly<{
  label: string;
  value: ReactNode;
}>) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-sm">{value}</span>
    </div>
  );
}

export function StorageProviderSummaryCard({
  summary,
}: Readonly<StorageProviderSummaryCardProps>) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <HardDrive className="h-5 w-5" />
          Storage configuration
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Active provider resolved at runtime from{" "}
          <span className="font-mono">STORAGE_PROVIDER</span> and credentials.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {summary.configurationErrors.length > 0 && (
          <div
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
            role="alert"
          >
            <p className="font-semibold">Storage configuration error</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              {summary.configurationErrors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid gap-2 rounded-lg border bg-muted/30 p-4 text-sm">
          <DetailRow
            label="Active provider"
            value={
              <Badge variant={summary.isEnabled ? "default" : "secondary"}>
                {summary.activeProviderLabel}
              </Badge>
            }
          />
          <DetailRow
            label="STORAGE_PROVIDER"
            value={summary.configuredProviderLabel}
          />
          <DetailRow
            label="Status"
            value={
              <Badge variant={summary.isEnabled ? "default" : "secondary"}>
                {summary.isEnabled ? "Enabled" : "Disabled"}
              </Badge>
            }
          />
          {summary.isEnabled && (
            <>
              <DetailRow
                label="Host"
                value={
                  summary.hostName
                    ? `${summary.protocol}://${summary.hostName}`
                    : "—"
                }
              />
              <DetailRow
                label="Access"
                value={
                  <Badge variant="outline">
                    {summary.isPrivate ? "Private (presigned)" : "Public"}
                  </Badge>
                }
              />
              <DetailRow
                label="Containers"
                value={`user-files: ${summary.userFilesContainer}, content: ${summary.contentContainer}`}
              />
            </>
          )}
          <DetailRow
            label="Credentials in env"
            value={
              <span className="flex flex-wrap gap-2">
                <Badge
                  variant={
                    summary.azureCredentialsPresent ? "default" : "outline"
                  }
                >
                  Azure {summary.azureCredentialsPresent ? "yes" : "no"}
                </Badge>
                <Badge
                  variant={summary.s3CredentialsPresent ? "default" : "outline"}
                >
                  S3 {summary.s3CredentialsPresent ? "yes" : "no"}
                </Badge>
              </span>
            }
          />
        </div>

        {summary.azure !== null && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">Azure configuration</h4>
            <div className="grid gap-2 rounded-lg border bg-muted/30 p-4 text-sm">
              <DetailRow label="Account" value={summary.azure.accountName} />
              <DetailRow
                label="Read SAS expiry"
                value={`${summary.azure.sasReadExpiryMinutes} min`}
              />
              <DetailRow
                label="Write SAS expiry"
                value={`${summary.azure.sasWriteExpirySeconds} s`}
              />
            </div>
          </div>
        )}

        {summary.s3 !== null && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold">S3 configuration</h4>
            <div className="grid gap-2 rounded-lg border bg-muted/30 p-4 text-sm">
              <DetailRow label="Endpoint" value={summary.s3.endpoint || "—"} />
              <DetailRow label="Region" value={summary.s3.region} />
              <DetailRow
                label="Path-style"
                value={summary.s3.forcePathStyle ? "Yes" : "No"}
              />
              <DetailRow
                label="Read presign expiry"
                value={`${summary.s3.sasReadExpiryMinutes} min`}
              />
              <DetailRow
                label="Write presign expiry"
                value={`${summary.s3.sasWriteExpirySeconds} s`}
              />
            </div>
          </div>
        )}

        {summary.isEnabled && summary.azure === null && summary.s3 === null && (
          <p className="text-sm text-muted-foreground">
            Provider is enabled but no provider-specific details are available.
            Check registration and environment variables.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
