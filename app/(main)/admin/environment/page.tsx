import { requireAdmin } from "@/components/admin-ui/admin-protection";
import { StorageProviderSummaryCard } from "@/components/admin-ui/storage-provider-summary-card";
import {
  getStorageAdminSummary,
  IMAGE_SERVICE_CONFIG,
} from "@/features/asset-storage/server";
import nextConfig from "@/next.config";
import { formatRemotePatternsForDisplay } from "@/lib/hosting/next-config-helper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  HardDrive,
  Image as ImageIcon,
} from "lucide-react";

const CANONICAL_STORAGE_AND_IMAGE_ENV_VARS = [
  "STORAGE_PROVIDER",
  "STORAGE_IS_PRIVATE",
  "STORAGE_USER_FILES_CONTAINER_NAME",
  "STORAGE_CONTENT_FILES_CONTAINER_NAME",
  "STORAGE_AZURE_ACCOUNT_NAME",
  "STORAGE_AZURE_ACCOUNT_KEY",
  "STORAGE_AZURE_ENDPOINT",
  "STORAGE_AZURE_SAS_READ_EXPIRY_MINUTES",
  "STORAGE_AZURE_SAS_WRITE_EXPIRY_SECONDS",
  "STORAGE_S3_ENDPOINT",
  "STORAGE_S3_ACCESS_KEY_ID",
  "STORAGE_S3_SECRET_ACCESS_KEY",
  "STORAGE_S3_REGION",
  "STORAGE_S3_FORCE_PATH_STYLE",
  "STORAGE_S3_READ_EXPIRY_MINUTES",
  "STORAGE_S3_WRITE_EXPIRY_SECONDS",
  "RESIZE_IMAGES",
  "RESIZE_IMAGES_WIDTH",
  "REMOTE_IMAGE_HOSTNAMES",
] as const;

const LEGACY_STORAGE_ENV_VARS = [
  "AZURE_STORAGE_ACCOUNT_NAME",
  "AZURE_STORAGE_ACCOUNT_KEY",
  "AZURE_STORAGE_CUSTOM_DOMAIN",
  "AZURE_STORAGE_IS_PRIVATE",
  "USER_FILES_STORAGE_CONTAINER_NAME",
  "CONTENT_STORAGE_CONTAINER_NAME",
] as const;

// Storage & image env vars – shown together for cohesion.
const STORAGE_AND_IMAGE_ENV_VARS = [
  ...CANONICAL_STORAGE_AND_IMAGE_ENV_VARS,
  ...LEGACY_STORAGE_ENV_VARS,
] as const;

// Define our known environment variables from env.d.ts
const KNOWN_ENV_VARS = [
  "NODE_ENV",
  ...STORAGE_AND_IMAGE_ENV_VARS,
  "ROBOTS_ALLOWED_DOMAINS",
  "ENDATIX_BASE_URL",
  "ENDATIX_API_PREFIX",
  "ENDATIX_API_URL",
  "AI_API_BASE_URL",
  "SESSION_SECRET",
  "NEXT_FORMS_COOKIE_NAME",
  "NEXT_FORMS_COOKIE_DURATION_DAYS",
  "NEXT_PUBLIC_RECAPTCHA_SITE_KEY",
  "SLACK_CLIENT_ID",
  "SLACK_CLIENT_SECRET",
  "SLACK_REDIRECT_URI",
  "NEXT_PUBLIC_SLK",
  "NEXT_PUBLIC_NAME",
  "OTEL_LOG_LEVEL",
  "APPLICATIONINSIGHTS_CONNECTION_STRING",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "NEXT_PUBLIC_POSTHOG_UI_HOST",
  "ENABLE_POSTHOG_ADAPTER",
  "NEXT_PUBLIC_IS_DEBUG_MODE",
  "NEXT_PUBLIC_MAX_IMAGE_SIZE",
] as const;

// Function to check if a variable name contains sensitive keywords
const isSensitiveVariable = (name: string): boolean => {
  const sensitiveKeywords = ["SECRET", "KEY", "SLK", "PASSWORD", "TOKEN"];
  return sensitiveKeywords.some((keyword) =>
    name.toUpperCase().includes(keyword),
  );
};

// Function to mask sensitive values
const maskValue = (value: string | undefined): string => {
  if (!value) return "Not set";
  return "•".repeat(Math.min(value.length, 8));
};

// Function to get environment variable value
const getEnvValue = (name: string): string | undefined => {
  return process.env[name];
};

// Function to check if variable is defined in our env.d.ts
const isKnownVariable = (name: string): boolean => {
  return KNOWN_ENV_VARS.includes(name as (typeof KNOWN_ENV_VARS)[number]);
};

export default async function EnvironmentPage() {
  await requireAdmin();

  const storageSummary = getStorageAdminSummary();

  // Get all environment variables
  const allEnvVars = Object.keys(process.env).sort();

  // Separate known and unknown variables
  const knownVars = allEnvVars.filter(isKnownVariable);
  const otherKnownVars = knownVars.filter(
    (name) => !(STORAGE_AND_IMAGE_ENV_VARS as readonly string[]).includes(name),
  );
  const unknownVars = allEnvVars.filter((name) => !isKnownVariable(name));

  const imageConfig = IMAGE_SERVICE_CONFIG;
  const remotePatternsDisplay = formatRemotePatternsForDisplay(
    nextConfig.images?.remotePatterns,
  );

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="mb-6 flex items-center gap-2">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Environment Variables</h1>
      </div>

      <StorageProviderSummaryCard summary={storageSummary} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Image service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">Resize enabled</span>
              <Badge variant="outline">
                {imageConfig.isResizeEnabled ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">
                Default resize width
              </span>
              <span className="font-mono">
                {imageConfig.defaultResizeWidth}px
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">
                Next.js images.remotePatterns
              </span>
              <span className="font-mono break-all text-muted-foreground">
                {remotePatternsDisplay}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage & Image env vars */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage & Image Variables ({STORAGE_AND_IMAGE_ENV_VARS.length})
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Canonical storage env vars first, followed by Azure legacy
            fallback names for migration visibility.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {STORAGE_AND_IMAGE_ENV_VARS.map((name) => {
              const value = getEnvValue(name);
              const isSensitive = isSensitiveVariable(name);
              const displayValue = isSensitive
                ? maskValue(value)
                : value || "Not set";

              return (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-lg border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {isSensitive ? (
                        <EyeOff className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-blue-500" />
                      )}
                      <span className="font-mono text-sm font-medium">
                        {name}
                      </span>
                    </div>
                    {isSensitive && (
                      <Badge variant="outline" className="text-xs">
                        Sensitive
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      {displayValue}
                    </span>
                    {value && (
                      <Badge variant="secondary" className="text-xs">
                        Set
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Other Known Environment Variables */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Other Known Variables ({otherKnownVars.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {otherKnownVars.map((name) => {
              const value = getEnvValue(name);
              const isSensitive = isSensitiveVariable(name);
              const displayValue = isSensitive
                ? maskValue(value)
                : value || "Not set";

              return (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-lg border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {isSensitive ? (
                        <EyeOff className="h-4 w-4 text-orange-500" />
                      ) : (
                        <Eye className="h-4 w-4 text-blue-500" />
                      )}
                      <span className="font-mono text-sm font-medium">
                        {name}
                      </span>
                    </div>
                    {isSensitive && (
                      <Badge variant="outline" className="text-xs">
                        Sensitive
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      {displayValue}
                    </span>
                    {value && (
                      <Badge variant="secondary" className="text-xs">
                        Set
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Unknown Environment Variables */}
      {unknownVars.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Unknown Variables ({unknownVars.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {unknownVars.map((name) => {
                const value = getEnvValue(name);
                const isSensitive = isSensitiveVariable(name);
                const displayValue = maskValue(value) || "Not set";

                return (
                  <div
                    key={name}
                    className="flex items-center justify-between rounded-lg border bg-card p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {isSensitive ? (
                          <EyeOff className="h-4 w-4 text-orange-500" />
                        ) : (
                          <Eye className="h-4 w-4 text-blue-500" />
                        )}
                        <span className="font-mono text-sm font-medium">
                          {name}
                        </span>
                      </div>
                      {isSensitive && (
                        <Badge variant="outline" className="text-xs">
                          Sensitive
                        </Badge>
                      )}
                      <Badge variant="destructive" className="text-xs">
                        Unknown
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        {displayValue}
                      </span>
                      {value && (
                        <Badge variant="secondary" className="text-xs">
                          Set
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
