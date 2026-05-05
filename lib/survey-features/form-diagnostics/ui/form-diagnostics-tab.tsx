"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Globe,
  Info,
  Layers,
  FileJson,
  Image as ImageIcon,
  Lock,
  Zap,
  ListTodo,
  FileUp,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ReactElementFactory } from "survey-react-ui";
import { FormDiagnosticsPlugin } from "../form-diagnostics-plugin";
import { ConvertLargeChoiceLists } from "./convert-large-choice-lists";

interface FormDiagnosticsViewProps {
  model?: FormDiagnosticsPlugin;
}

interface FormDiagnosticsTabProps {
  data?: FormDiagnosticsPlugin | { model?: FormDiagnosticsPlugin };
}

interface DiagnosticsIssue {
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  url?: string;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export const FormDiagnosticsView = ({
  model,
}: Readonly<FormDiagnosticsViewProps>) => {
  const stats = model?.stats;

  const issues = useMemo(() => {
    if (!stats) return [];
    const list: DiagnosticsIssue[] = [];

    if (stats.uncompressedSize > 1024 * 1024) {
      list.push({
        title: "Large JSON Size",
        description: `The form JSON is ${formatSize(stats.uncompressedSize)} as UTF-8, which may impact load times.`,
        severity: "warning",
      });
    }

    if (stats.totalQuestions > 100) {
      list.push({
        title: "High Question Count",
        description: `The form contains ${formatNumber(stats.totalQuestions)} questions. Consider splitting it into multiple pages or forms if possible.`,
        severity: "info",
      });
    }

    if (stats.embeddedImagesCount > 5) {
      list.push({
        title: "Embedded Images Detected",
        description: `Found ${formatNumber(stats.embeddedImagesCount)} base64 embedded images${stats.embeddedImagesSizeBytes > 0 ? ` (${formatSize(stats.embeddedImagesSizeBytes)} total).` : "."} Use external URLs if possible.`,
        severity: "warning",
      });
    }

    if (stats.logicConditionsCount > 50) {
      list.push({
        title: "Complex Logic Found",
        description: `The form has ${formatNumber(stats.logicConditionsCount)} logic conditions. This might affect client-side performance.`,
        severity: "warning",
      });
    }

    if (stats.fileUploadWithoutBlobCount > 0) {
      list.push({
        title: "File Upload without Blob Storage",
        description: `${formatNumber(stats.fileUploadWithoutBlobCount)} file upload questions are storing data as text in the JSON. This can lead to massive submission sizes.`,
        severity: "critical",
      });
    }

    return list;
  }, [stats]);

  if (!model || !stats) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No diagnostics data available.
      </div>
    );
  }

  const requiresReCaptcha = model.requiresReCaptcha;
  const isPublic = model.isPublic;
  const choicesJsonThreshold = 100 * 1024;
  const maxSingleChoicesThreshold = 50 * 1024;
  const shouldHighlightConverter =
    stats.maxDropdownChoicesCount > 200 ||
    stats.totalChoicesJsonSize > choicesJsonThreshold ||
    stats.maxChoicesJsonSize > maxSingleChoicesThreshold;
  const converterAttentionMessage = shouldHighlightConverter
    ? `Large choices detected (max dropdown: ${formatNumber(stats.maxDropdownChoicesCount)}, choices JSON total: ${formatSize(stats.totalChoicesJsonSize)}, max single: ${formatSize(stats.maxChoicesJsonSize)}). Use bulk conversion below to move inline choices into data lists.`
    : undefined;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-destructive border-destructive/50 bg-destructive/10";
      case "warning":
        return "text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-800";
      case "info":
        return "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800";
      default:
        return "";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-4 w-4" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4" />;
      case "info":
        return <Info className="h-4 w-4" />;
      default:
        return <CheckCircle2 className="h-4 w-4" />;
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background p-6">
      <Card className="mx-auto max-w-6xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Layers className="h-6 w-6" />
            Diagnostics
          </CardTitle>
          <CardDescription className="text-sm">
            Checks form size, questions, choices, logic, assets, and security
            signals.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              FORM ELEMENTS AND COMPLEXITY
            </h4>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-5">
              <div className="flex flex-col gap-1.5 rounded-lg border bg-card p-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <FileJson className="h-4 w-4" /> JSON Size (UTF-8)
                </span>
                <span className="text-xl font-semibold">
                  {formatSize(stats.uncompressedSize)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 rounded-lg border bg-card p-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <ListTodo className="h-4 w-4" /> Questions
                </span>
                <span className="text-xl font-semibold">
                  {formatNumber(stats.totalQuestions)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 rounded-lg border bg-card p-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <ImageIcon className="h-4 w-4" /> Images
                </span>
                <span className="text-xl font-semibold">
                  {formatNumber(stats.embeddedImagesCount)}
                  {stats.embeddedImagesSizeBytes > 0 && (
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      ({formatSize(stats.embeddedImagesSizeBytes)})
                    </span>
                  )}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 rounded-lg border bg-card p-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Zap className="h-4 w-4" /> Logic conditions
                </span>
                <span className="text-xl font-semibold">
                  {formatNumber(stats.logicConditionsCount)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 rounded-lg border bg-card p-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <EyeOff className="h-4 w-4" /> Hidden (invisible)
                </span>
                <span className="text-xl font-semibold">
                  {formatNumber(stats.invisibleLogicItemsCount)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 rounded-lg border bg-card p-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  Dropdowns
                </span>
                <span className="text-xl font-semibold">
                  {formatNumber(stats.dropdownCount)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 rounded-lg border bg-card p-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  Choices (Max)
                </span>
                <span className="text-xl font-semibold">
                  {formatNumber(stats.maxDropdownChoicesCount)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 rounded-lg border bg-card p-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  Choices JSON (total)
                </span>
                <span className="text-xl font-semibold">
                  {formatSize(stats.totalChoicesJsonSize)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 rounded-lg border bg-card p-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  Choices JSON (max)
                </span>
                <span className="text-xl font-semibold">
                  {formatSize(stats.maxChoicesJsonSize)}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 rounded-lg border bg-card p-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <FileUp className="h-4 w-4" /> File Uploads
                </span>
                <span className="text-xl font-semibold">
                  {formatNumber(stats.fileUploadCount)}
                </span>
              </div>
            </div>
          </div>

          <ConvertLargeChoiceLists
            model={model}
            attentionMessage={converterAttentionMessage}
          />

          <div>
            <h4 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Security
            </h4>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-5">
              <div className="flex flex-col gap-1.5 rounded-lg border bg-card p-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  {requiresReCaptcha ? (
                    <ShieldCheck className="h-4 w-4 text-green-500" />
                  ) : (
                    <ShieldX className="h-4 w-4 text-muted-foreground" />
                  )}{" "}
                  reCAPTCHA
                </span>
                <span className="text-xl font-semibold">
                  {requiresReCaptcha ? "Enabled" : "Disabled"}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 rounded-lg border bg-card p-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  {isPublic === true ? (
                    <Globe className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}{" "}
                  Visibility
                </span>
                <span className="text-xl font-semibold">
                  {isPublic === true
                    ? "Public"
                    : isPublic === false
                      ? "Private"
                      : "-"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {isPublic === true
                    ? "Accessible to anyone with the link."
                    : isPublic === false
                      ? "Only for authenticated users (more secure)."
                      : ""}
                </span>
              </div>
            </div>
          </div>

          {issues.length > 0 ? (
            <div className="space-y-3 pt-2">
              <h4 className="flex items-center gap-2 text-sm font-medium">
                Potential Issues{" "}
                <Badge variant="secondary">{formatNumber(issues.length)}</Badge>
              </h4>
              {issues.map((issue, index) => (
                <Alert key={index} className={getSeverityColor(issue.severity)}>
                  {getSeverityIcon(issue.severity)}
                  <AlertTitle className="text-sm font-semibold">
                    {issue.title}
                  </AlertTitle>
                  <AlertDescription className="text-xs opacity-90">
                    {issue.description}
                    {issue.url && (
                      <span className="mt-2 block">
                        <a
                          href={issue.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-primary underline underline-offset-2 hover:no-underline"
                        >
                          RESTful choices (ChoicesRestful) -&gt;
                        </a>
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <Alert className="border-green-200 bg-green-50 text-green-600 dark:border-green-800 dark:bg-green-950/20 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>All Good!</AlertTitle>
              <AlertDescription>
                No issues detected in the form structure.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

function getDiagnosticsModel(
  data: FormDiagnosticsTabProps["data"],
): FormDiagnosticsPlugin | undefined {
  if (data instanceof FormDiagnosticsPlugin) {
    return data;
  }

  return data?.model;
}

export function FormDiagnosticsTab({
  data,
}: Readonly<FormDiagnosticsTabProps>) {
  const model = getDiagnosticsModel(data);

  return <FormDiagnosticsView model={model} />;
}

function renderFormDiagnosticsTab(props: unknown) {
  return <FormDiagnosticsTab {...(props as FormDiagnosticsTabProps)} />;
}

let isRegistered = false;
export function registerFormDiagnosticsTab() {
  if (isRegistered) return;

  ReactElementFactory.Instance.registerElement(
    "svc-tab-form-diagnostics",
    renderFormDiagnosticsTab,
  );
  isRegistered = true;
}
