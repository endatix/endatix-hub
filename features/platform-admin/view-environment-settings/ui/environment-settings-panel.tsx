"use client";

import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, FlaskConical, Server } from "lucide-react";
import CopyToClipboard from "@/components/copy-to-clipboard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { EnvironmentAdminSummary } from "../types";

interface EnvironmentSettingsPanelProps {
  summary: EnvironmentAdminSummary;
}

function DetailRow({
  label,
  value,
  nested = false,
}: Readonly<{
  label: string;
  value: ReactNode;
  nested?: boolean;
}>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2",
        nested && "ml-1 border-l border-border pl-3",
      )}
    >
      <span className={cn("text-muted-foreground", nested && "text-xs")}>
        {label}
      </span>
      <span className={cn("font-mono text-sm", nested && "text-xs")}>
        {value}
      </span>
    </div>
  );
}

export function EnvironmentSettingsPanel({
  summary,
}: Readonly<EnvironmentSettingsPanelProps>) {
  const showUrlParts =
    summary.apiConfigured &&
    (summary.baseUrl !== null || summary.prefix !== null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Server className="h-5 w-5" />
            Hub runtime
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Endatix API origin resolved from process environment at request
            time. Change via deployment env (Helm, Docker, host), not in this
            UI.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 rounded-lg border bg-muted/30 p-4 text-sm">
            <DetailRow
              label="Status"
              value={
                summary.apiConfigured ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Configured
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="gap-1 text-muted-foreground"
                  >
                    <AlertCircle className="h-3 w-3" />
                    Not configured
                  </Badge>
                )
              }
            />
            <div className="space-y-2">
              <DetailRow
                label="Endatix API URL"
                value={
                  summary.apiConfigured ? (
                    <span className="inline-flex max-w-full items-center gap-1.5">
                      <span className="truncate">{summary.apiUrl}</span>
                      <CopyToClipboard
                        layout="inline"
                        copyValue={summary.apiUrl}
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
                  {summary.baseUrl !== null && (
                    <DetailRow
                      nested
                      label="API origin"
                      value={summary.baseUrl}
                    />
                  )}
                  {summary.prefix !== null && (
                    <DetailRow
                      nested
                      label="API prefix"
                      value={summary.prefix === "" ? "(none)" : summary.prefix}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FlaskConical className="h-5 w-5" />
            Experimental
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Feature gates from{" "}
            <span className="font-mono">ENDATIX_ENABLE_*</span> env vars. Use
            with caution in production.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 rounded-lg border bg-muted/30 p-4 text-sm">
            <DetailRow
              label="extensions"
              value={
                <Badge
                  variant={summary.extensionsEnabled ? "default" : "secondary"}
                >
                  {summary.extensionsEnabled ? "Enabled" : "Disabled"}
                </Badge>
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
