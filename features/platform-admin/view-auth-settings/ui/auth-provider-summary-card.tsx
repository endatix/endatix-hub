import type { ReactNode } from "react";
import Link from "next/link";
import type { AuthSettings } from "@/lib/endatix-api/auth-admin/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound } from "lucide-react";
import type { AuthAdminSummary } from "../view-auth-settings.server";

type AuthProviderSummaryCardProps = {
  summary: AuthAdminSummary;
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

function ProviderStatusBadge({
  isActive,
  isEnabled,
}: Readonly<{ isActive: boolean; isEnabled?: boolean }>) {
  if (isActive) {
    return <Badge variant="default">Active</Badge>;
  }

  if (isEnabled) {
    return <Badge variant="secondary">Enabled</Badge>;
  }

  return <Badge variant="outline">Inactive</Badge>;
}

function ApiProvidersSection({ api }: Readonly<{ api: AuthSettings | null }>) {
  if (!api) {
    return (
      <p className="text-sm text-muted-foreground">
        API auth settings could not be loaded. Verify platform admin access and
        API connectivity.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {api.configurationErrors.length > 0 && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
          role="alert"
        >
          <p className="font-semibold">API configuration errors</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {api.configurationErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {api.providers.map((provider) => (
        <div key={provider.providerId} className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">{provider.displayName}</h4>
            <ProviderStatusBadge
              isActive={provider.isActive}
              isEnabled={provider.isEnabled}
            />
          </div>
          <div className="grid gap-2 rounded-lg border bg-muted/30 p-4 text-sm">
            <DetailRow label="Provider ID" value={provider.providerId} />
            <DetailRow
              label="Registered"
              value={provider.isRegistered ? "Yes" : "No"}
            />
            {provider.issuer && (
              <DetailRow label="Issuer" value={provider.issuer} />
            )}
            {provider.audiences.length > 0 && (
              <DetailRow
                label="Audiences"
                value={provider.audiences.join(", ")}
              />
            )}
            {provider.accessExpiryMinutes !== null && (
              <DetailRow
                label="Access expiry"
                value={`${provider.accessExpiryMinutes} min`}
              />
            )}
            {provider.refreshExpiryDays !== null && (
              <DetailRow
                label="Refresh expiry"
                value={`${provider.refreshExpiryDays} days`}
              />
            )}
            {provider.requireHttpsMetadata !== null && (
              <DetailRow
                label="Require HTTPS metadata"
                value={provider.requireHttpsMetadata ? "Yes" : "No"}
              />
            )}
            {provider.endatixJwt && (
              <>
                <DetailRow
                  label="Signing key configured"
                  value={
                    provider.endatixJwt.signingKeyConfigured ? "Yes" : "No"
                  }
                />
                {provider.endatixJwt.reBacIssuer && (
                  <DetailRow
                    label="ReBAC issuer"
                    value={provider.endatixJwt.reBacIssuer}
                  />
                )}
                {provider.endatixJwt.formAccessTokenExpiryMinutes !== null && (
                  <DetailRow
                    label="Form access expiry"
                    value={`${provider.endatixJwt.formAccessTokenExpiryMinutes} min`}
                  />
                )}
              </>
            )}
            {provider.keycloak && (
              <>
                {provider.keycloak.clientId && (
                  <DetailRow
                    label="Client ID"
                    value={provider.keycloak.clientId}
                  />
                )}
                <DetailRow
                  label="Client secret configured"
                  value={
                    provider.keycloak.clientSecretConfigured ? "Yes" : "No"
                  }
                />
                <DetailRow
                  label="Role mappings"
                  value={
                    provider.keycloak.roleMappingsConfigured
                      ? `${provider.keycloak.roleMappingCount} configured`
                      : "Not configured"
                  }
                />
                {provider.keycloak.rolesPath && (
                  <DetailRow
                    label="Roles path"
                    value={provider.keycloak.rolesPath}
                  />
                )}
                <DetailRow
                  label="Reject duplicate email"
                  value={provider.keycloak.rejectDuplicateEmail ? "Yes" : "No"}
                />
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function AuthProviderSummaryCard({
  summary,
}: Readonly<AuthProviderSummaryCardProps>) {
  return (
    <div className="space-y-6">
      {summary.driftHints.length > 0 && (
        <div
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100"
          role="status"
        >
          <p className="font-semibold">Configuration drift detected</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            {summary.driftHints.map((hint) => (
              <li key={hint.message}>{hint.message}</li>
            ))}
          </ul>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5" />
            API authentication
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Token validation, JWT expiries, and external provider authorization
            as configured in the Endatix API.
          </p>
        </CardHeader>
        <CardContent>
          <ApiProvidersSection api={summary.api} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <KeyRound className="h-5 w-5" />
            Hub sign-in and session
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            NextAuth providers, session lifetime, and OIDC client configuration
            for the Hub login experience.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {summary.hub.configurationErrors.length > 0 && (
            <div
              className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
              role="alert"
            >
              <p className="font-semibold">Hub configuration errors</p>
              <ul className="mt-2 list-inside list-disc space-y-1">
                {summary.hub.configurationErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-2 rounded-lg border bg-muted/30 p-4 text-sm">
            <DetailRow
              label="AUTH_SECRET"
              value={
                summary.hub.sessionSecretConfigured ? "Configured" : "Not set"
              }
            />
            <DetailRow
              label="Session max age"
              value={
                summary.hub.sessionMaxAgeMinutes !== null
                  ? `${summary.hub.sessionMaxAgeMinutes} min`
                  : "Default"
              }
            />
          </div>

          {summary.hub.providers.length > 0 ? (
            summary.hub.providers.map((provider) => (
              <div key={provider.id} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold">{provider.name}</h4>
                  <ProviderStatusBadge isActive={provider.isActive} />
                </div>
                <div className="grid gap-2 rounded-lg border bg-muted/30 p-4 text-sm">
                  <DetailRow label="Provider ID" value={provider.id} />
                  <DetailRow label="Type" value={provider.type} />
                  {provider.issuer && (
                    <DetailRow label="Issuer" value={provider.issuer} />
                  )}
                  {provider.clientId && (
                    <DetailRow label="Client ID" value={provider.clientId} />
                  )}
                  {provider.id === "keycloak" && (
                    <DetailRow
                      label="Client secret configured"
                      value={provider.clientSecretConfigured ? "Yes" : "No"}
                    />
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              No active Hub sign-in providers are configured.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Platform admin approval</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            PlatformAdmin access always requires local approval in Endatix, even
            when an external identity provider nominates the role.
          </p>
          <p>
            Manage local approvals on the{" "}
            <Link
              href="/admin/platform-admins"
              className="text-primary underline"
            >
              Platform Admins
            </Link>{" "}
            page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
