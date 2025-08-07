import { requireAdmin } from "@/components/admin-ui/admin-protection";
import { STORAGE_SERVICE_CONFIG } from "@/features/storage/infrastructure/storage-service";
import nextConfig from "@/next.config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

// Define our known environment variables from env.d.ts
const KNOWN_ENV_VARS = [
  "NODE_ENV",
  "REMOTE_IMAGE_HOSTNAMES",
  "ROBOTS_ALLOWED_DOMAINS",
  "ENDATIX_BASE_URL",
  "AI_API_BASE_URL",
  "SESSION_SECRET",
  "NEXT_FORMS_COOKIE_NAME",
  "NEXT_FORMS_COOKIE_DURATION_DAYS",
  "NEXT_PUBLIC_RECAPTCHA_SITE_KEY",
  "SLACK_CLIENT_ID",
  "SLACK_CLIENT_SECRET",
  "SLACK_REDIRECT_URI",
  "AZURE_STORAGE_ACCOUNT_NAME",
  "AZURE_STORAGE_ACCOUNT_KEY",
  "USER_FILES_STORAGE_CONTAINER_NAME",
  "CONTENT_STORAGE_CONTAINER_NAME",
  "RESIZE_IMAGES",
  "RESIZE_IMAGES_WIDTH",
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

  // Get all environment variables
  const allEnvVars = Object.keys(process.env).sort();

  // Separate known and unknown variables
  const knownVars = allEnvVars.filter(isKnownVariable);
  const unknownVars = allEnvVars.filter((name) => !isKnownVariable(name));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Shield className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Environment Variables</h1>
      </div>

      {/* Key Environment Variables */}
      <Card>
        <CardHeader>
          <CardTitle>Key Environment Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <span className="font-medium">Azure Storage</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {STORAGE_SERVICE_CONFIG.isEnabled ? "Enabled" : "Disabled"}
                </span>
                <Badge
                  variant={
                    STORAGE_SERVICE_CONFIG.isEnabled ? "default" : "secondary"
                  }
                >
                  {STORAGE_SERVICE_CONFIG.hostName}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <span className="font-medium">Remote Image Hostnames</span>
              <span className="text-sm text-muted-foreground">
                {nextConfig?.images?.remotePatterns
                  ?.map((p) => p.hostname)
                  .join(", ") || "None configured"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Known Environment Variables */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Known Variables ({knownVars.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {knownVars.map((name) => {
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
