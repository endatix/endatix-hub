import { requireAdmin } from "@/components/admin-ui/admin-protection";
import {
  getStorageConfig,
  type AzureStorageConfig,
} from "@/features/asset-storage/server";
import nextConfig from "@/next.config";
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

// Storage & image env vars (from storage-config.ts and image-service) – shown together for cohesion
const STORAGE_AND_IMAGE_ENV_VARS = [
  "AZURE_STORAGE_ACCOUNT_NAME",
  "AZURE_STORAGE_ACCOUNT_KEY",
  "AZURE_STORAGE_CUSTOM_DOMAIN",
  "AZURE_STORAGE_IS_PRIVATE",
  "AZURE_STORAGE_SAS_READ_EXPIRY_MINUTES",
  "AZURE_STORAGE_SAS_TOKEN_EXPIRY_MINUTES",
  "USER_FILES_STORAGE_CONTAINER_NAME",
  "CONTENT_STORAGE_CONTAINER_NAME",
  "RESIZE_IMAGES",
  "RESIZE_IMAGES_WIDTH",
  "REMOTE_IMAGE_HOSTNAMES",
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

  const storageConfig = getStorageConfig();

  // Get all environment variables
  const allEnvVars = Object.keys(process.env).sort();

  // Separate known and unknown variables
  const knownVars = allEnvVars.filter(isKnownVariable);
  const otherKnownVars = knownVars.filter(
    (name) => !(STORAGE_AND_IMAGE_ENV_VARS as readonly string[]).includes(name),
  );
  const unknownVars = allEnvVars.filter((name) => !isKnownVariable(name));

  const { imageConfig } = storageConfig;
  const remoteHostnames =
    nextConfig?.images?.remotePatterns?.map((p) => p.hostname).join(", ") ||
    "None configured";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Environment Variables</h1>
      </div>

      {/* Azure Storage & Image – resolved config from storage-config.ts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Azure Storage & Image Configuration
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Resolved values from storage-config and image-service (env vars
            below)
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Azure Storage */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Azure Storage
            </h4>
            <div className="grid gap-2 rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  variant={storageConfig.isEnabled ? "default" : "secondary"}
                >
                  {storageConfig.isEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
              {storageConfig.isEnabled && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">Host name</span>
                    <span className="font-mono">
                      {storageConfig.hostName || "—"}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">Private</span>
                    <Badge variant="outline">
                      {storageConfig.isPrivate ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">Containers</span>
                    <span className="font-mono text-muted-foreground">
                      user-files: {storageConfig.containerNames.USER_FILES},
                      content: {storageConfig.containerNames.CONTENT}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      SAS read expiry
                    </span>
                    <span>
                      {(storageConfig as AzureStorageConfig)
                        .sasReadExpiryMinutes ?? "—"}{" "}
                      min
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Image */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              Image
            </h4>
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
                  Remote image hostnames
                </span>
                <span className="font-mono text-muted-foreground break-all">
                  {remoteHostnames}
                </span>
              </div>
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
            Env vars that drive the configuration above (order matches
            storage-config)
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
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
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
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
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
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
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
