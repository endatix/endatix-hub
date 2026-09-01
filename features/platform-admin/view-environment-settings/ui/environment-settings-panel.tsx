"use client";

import {
  AlertCircle,
  BarChart3,
  Bug,
  CheckCircle2,
  FlaskConical,
  Server,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import CopyToClipboard from "@/components/copy-to-clipboard";
import { Badge } from "@/components/ui/badge";
import type { EnvironmentAdminSummary } from "../types";
import { ConfigRow } from "./config-row";
import { ConfigSection } from "./config-section";
import { SecretPresenceBadge } from "./secret-presence";

interface EnvironmentSettingsPanelProps {
  summary: EnvironmentAdminSummary;
}

export function EnvironmentSettingsPanel({
  summary,
}: Readonly<EnvironmentSettingsPanelProps>) {
  const { api, experimental, debug, analytics, recaptcha, surveyJs } = summary;

  const showUrlParts =
    api.apiConfigured && (api.baseUrl !== null || api.prefix !== null);

  return (
    <div className="space-y-6">
      <ConfigSection
        icon={Server}
        title="API"
        description="Endatix API origin resolved from process environment at request time. Change via deployment env (Helm, Docker, host), not in this UI."
      >
        <ConfigRow
          label="Status"
          tooltip="ENDATIX_BASE_URL or ENDATIX_API_BASE_URL"
          value={
            api.apiConfigured ? (
              <Badge variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Configured
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-muted-foreground">
                <AlertCircle className="h-3 w-3" />
                Not configured
              </Badge>
            )
          }
        />
        <div className="space-y-2">
          <ConfigRow
            label="Endatix API URL"
            value={
              api.apiConfigured ? (
                <span className="inline-flex max-w-full items-center gap-1.5">
                  <span className="truncate">{api.apiUrl}</span>
                  <CopyToClipboard
                    layout="inline"
                    copyValue={api.apiUrl}
                    label="Copy Endatix API URL"
                    buttonClassName="h-7 w-7"
                  />
                </span>
              ) : (
                "—"
              )
            }
          />
          {showUrlParts && (
            <div className="space-y-2 pl-2">
              {api.baseUrl !== null && (
                <ConfigRow nested label="API origin" value={api.baseUrl} />
              )}
              {api.prefix !== null && (
                <ConfigRow
                  nested
                  label="API prefix"
                  value={api.prefix === "" ? "(none)" : api.prefix}
                />
              )}
            </div>
          )}
        </div>
      </ConfigSection>

      <ConfigSection
        icon={FlaskConical}
        title="Experimental"
        description="Feature gates from ENDATIX_ENABLE_* env vars. Use with caution in production."
      >
        <ConfigRow
          label="SurveyJS extensions"
          tooltip="ENDATIX_ENABLE_EXTENSIONS"
          value={
            <Badge
              variant={experimental.extensionsEnabled ? "default" : "secondary"}
            >
              {experimental.extensionsEnabled ? "Enabled" : "Disabled"}
            </Badge>
          }
        />
      </ConfigSection>

      <ConfigSection
        icon={Bug}
        title="Debug"
        description="Diagnostic flags resolved at request time."
      >
        <ConfigRow
          label="Debug mode"
          tooltip="ENDATIX_IS_DEBUG_MODE"
          value={
            <Badge variant={debug.isDebugMode ? "default" : "secondary"}>
              {debug.isDebugMode ? "On" : "Off"}
            </Badge>
          }
        />
        <ConfigRow label="NODE_ENV" value={debug.nodeEnv} />
      </ConfigSection>

      <ConfigSection
        icon={BarChart3}
        title="Analytics"
        description="PostHog client configuration. The project key is never shown."
      >
        <ConfigRow
          label="PostHog project key"
          tooltip="ENDATIX_POSTHOG_KEY"
          value={
            <SecretPresenceBadge
              presence={analytics.posthogKey}
              envVar="ENDATIX_POSTHOG_KEY"
            />
          }
        />
        <ConfigRow
          label="PostHog host"
          tooltip="ENDATIX_POSTHOG_HOST"
          value={
            analytics.posthogHost ? (
              <span className="inline-flex max-w-full items-center gap-1.5">
                <span className="truncate">{analytics.posthogHost}</span>
                <CopyToClipboard
                  layout="inline"
                  copyValue={analytics.posthogHost}
                  label="Copy PostHog host"
                  buttonClassName="h-7 w-7"
                />
              </span>
            ) : (
              "—"
            )
          }
        />
        <ConfigRow
          label="PostHog UI host"
          tooltip="ENDATIX_POSTHOG_UI_HOST"
          value={
            analytics.posthogUiHost ? (
              <span className="inline-flex max-w-full items-center gap-1.5">
                <span className="truncate">{analytics.posthogUiHost}</span>
                <CopyToClipboard
                  layout="inline"
                  copyValue={analytics.posthogUiHost}
                  label="Copy PostHog UI host"
                  buttonClassName="h-7 w-7"
                />
              </span>
            ) : (
              "—"
            )
          }
        />
      </ConfigSection>

      <ConfigSection
        icon={ShieldCheck}
        title="reCAPTCHA"
        description="Public site key used in the browser. Value is not shown on this page."
      >
        <ConfigRow
          label="Site key"
          tooltip="ENDATIX_RECAPTCHA_SITE_KEY"
          value={
            <SecretPresenceBadge
              presence={recaptcha.siteKey}
              envVar="ENDATIX_RECAPTCHA_SITE_KEY"
            />
          }
        />
      </ConfigSection>

      <ConfigSection
        icon={Wrench}
        title="SurveyJS"
        description="Creator licence key is server-only and never sent to the browser."
      >
        <ConfigRow
          label="Creator licence"
          tooltip="ENDATIX_SURVEY_LICENSE_KEY"
          value={
            <SecretPresenceBadge
              presence={surveyJs.license}
              envVar="ENDATIX_SURVEY_LICENSE_KEY"
            />
          }
        />
      </ConfigSection>
    </div>
  );
}
