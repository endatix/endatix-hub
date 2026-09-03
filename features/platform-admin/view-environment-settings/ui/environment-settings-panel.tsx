"use client";

import {
  BarChart3,
  Bug,
  FlaskConical,
  Server,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import type { EnvironmentAdminSummary } from "../types";
import { ConfigRow } from "./config-row";
import { ConfigSection } from "./config-section";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfigValue } from "./config-value";
import type { EnvironmentCheck } from "./environment-overview";
import { EnvironmentOverview } from "./environment-overview";
import { SecretPresenceBadge } from "./secret-presence";

interface EnvironmentSettingsPanelProps {
  summary: EnvironmentAdminSummary;
}

/**
 * Read-only view of the resolved Hub runtime configuration: an overview strip answering
 * "is anything missing?", then one card per configuration group. Secrets render as
 * Set / Not set presence badges only — no secret value reaches this component.
 */
export function EnvironmentSettingsPanel({
  summary,
}: Readonly<EnvironmentSettingsPanelProps>) {
  const { api, experimental, debug, analytics, recaptcha, surveyJs } = summary;

  const showUrlParts =
    api.apiConfigured && (api.baseUrl !== null || api.prefix !== null);

  const checks: readonly EnvironmentCheck[] = [
    { label: "Endatix API URL", configured: api.apiConfigured, required: true },
    {
      label: "PostHog project key",
      configured: Boolean(analytics.posthogKey),
    },
    { label: "reCAPTCHA site key", configured: Boolean(recaptcha.siteKey) },
    {
      label: "SurveyJS creator licence",
      configured: surveyJs.license.configured,
    },
  ];

  return (
    <div className="space-y-6">
      <EnvironmentOverview nodeEnv={debug.nodeEnv} checks={checks} />

      <div className="grid-card-list">
        <ConfigSection
          icon={Server}
          title="API"
          description="Endatix API origin resolved from process environment at request time. Change via deployment env (Helm, Docker, host), not in this UI."
        >
          <ConfigRow
            label="Status"
            value={
              <StatusBadge
                tone={api.apiConfigured ? "on" : "attention"}
                label={api.apiConfigured ? "Configured" : "Not configured"}
              />
            }
          />
          <ConfigRow
            label="Endatix API URL"
            envVar="ENDATIX_BASE_URL / ENDATIX_API_URL"
            value={
              <ConfigValue
                value={api.apiConfigured ? api.apiUrl : null}
                copyLabel="Copy Endatix API URL"
              />
            }
          />
          {showUrlParts && api.baseUrl !== null && (
            <ConfigRow
              nested
              label="API origin"
              value={
                <ConfigValue value={api.baseUrl} copyLabel="Copy API origin" />
              }
            />
          )}
          {showUrlParts && api.prefix !== null && (
            <ConfigRow
              nested
              label="API prefix"
              envVar="ENDATIX_API_PREFIX"
              value={
                <ConfigValue
                  value={api.prefix}
                  copyLabel="Copy API prefix"
                  copyable={false}
                />
              }
            />
          )}
        </ConfigSection>

        <ConfigSection
          icon={Bug}
          title="Debug"
          description="Diagnostic flags resolved at request time."
        >
          <ConfigRow
            label="Debug mode"
            envVar="ENDATIX_IS_DEBUG_MODE"
            value={
              <StatusBadge
                tone={debug.isDebugMode ? "on" : "off"}
                label={debug.isDebugMode ? "On" : "Off"}
              />
            }
          />
          <ConfigRow
            label="Node environment"
            envVar="NODE_ENV"
            value={
              <ConfigValue
                value={debug.nodeEnv}
                copyLabel="Copy NODE_ENV"
                copyable={false}
              />
            }
          />
        </ConfigSection>

        <ConfigSection
          icon={FlaskConical}
          title="Experimental"
          description="Feature gates from ENDATIX_ENABLE_* env vars. Use with caution in production."
        >
          <ConfigRow
            label="SurveyJS extensions"
            envVar="ENDATIX_ENABLE_EXTENSIONS"
            value={
              <StatusBadge
                tone={experimental.extensionsEnabled ? "on" : "off"}
                label={experimental.extensionsEnabled ? "Enabled" : "Disabled"}
              />
            }
          />
        </ConfigSection>

        <ConfigSection
          icon={BarChart3}
          title="Analytics"
          description="PostHog client configuration. All three values are public — they ship to every browser as part of the client config."
        >
          <ConfigRow
            label="PostHog project key"
            envVar="ENDATIX_POSTHOG_KEY"
            value={
              <ConfigValue
                value={analytics.posthogKey || null}
                copyLabel="Copy PostHog project key"
              />
            }
          />
          <ConfigRow
            label="PostHog host"
            envVar="ENDATIX_POSTHOG_HOST"
            value={
              <ConfigValue
                value={analytics.posthogHost || null}
                copyLabel="Copy PostHog host"
              />
            }
          />
          <ConfigRow
            label="PostHog UI host"
            envVar="ENDATIX_POSTHOG_UI_HOST"
            value={
              <ConfigValue
                value={analytics.posthogUiHost || null}
                copyLabel="Copy PostHog UI host"
              />
            }
          />
        </ConfigSection>

        <ConfigSection
          icon={ShieldCheck}
          title="reCAPTCHA"
          description="Public site key. It is embedded in the reCAPTCHA script URL on every form that uses it."
        >
          <ConfigRow
            label="Site key"
            envVar="ENDATIX_RECAPTCHA_SITE_KEY"
            value={
              <ConfigValue
                value={recaptcha.siteKey || null}
                copyLabel="Copy reCAPTCHA site key"
              />
            }
          />
        </ConfigSection>

        <ConfigSection
          icon={Wrench}
          title="SurveyJS"
          description="The only secret on this page. The Creator licence is server-only, never sent to the browser, and shown as presence alone."
        >
          <ConfigRow
            label="Creator licence"
            envVar="ENDATIX_SURVEY_LICENSE_KEY"
            value={<SecretPresenceBadge presence={surveyJs.license} />}
          />
        </ConfigSection>
      </div>
    </div>
  );
}
