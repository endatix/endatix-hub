"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ConfigStatusBadge } from "./config-status-badge";

export interface EnvironmentCheck {
  /** Human name of the setting, used when listing what is not configured. */
  readonly label: string;
  readonly configured: boolean;
  /** Required settings drive the page-level attention state. */
  readonly required?: boolean;
}

interface EnvironmentOverviewProps {
  nodeEnv: string;
  checks: readonly EnvironmentCheck[];
}

/**
 * Answers "is anything missing?" before the operator scrolls six sections.
 * Deliberately not a stat dashboard: one runtime fact, one rollup, one list.
 */
export function EnvironmentOverview({
  nodeEnv,
  checks,
}: Readonly<EnvironmentOverviewProps>) {
  const configuredCount = checks.filter((check) => check.configured).length;
  const missing = checks.filter((check) => !check.configured);
  const hasRequiredGap = missing.some((check) => check.required);

  let tone: "on" | "off" | "attention" = "on";
  if (hasRequiredGap) {
    tone = "attention";
  } else if (missing.length > 0) {
    tone = "off";
  }

  return (
    <Card className="gap-0 py-5">
      <CardContent className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium tracking-wide text-on-surface-variant uppercase">
            Node environment
          </span>
          <span className="font-mono text-sm text-foreground">{nodeEnv}</span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
          {missing.length > 0 && (
            <span className="text-xs text-muted-foreground">
              Not set: {missing.map((check) => check.label).join(", ")}
            </span>
          )}
          <ConfigStatusBadge
            tone={tone}
            label={`${configuredCount} of ${checks.length} configured`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
