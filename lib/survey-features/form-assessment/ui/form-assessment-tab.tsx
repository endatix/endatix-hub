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
import { FormAssessmentPlugin } from "../form-assessment-plugin";

interface FormAssessmentViewProps {
  model: FormAssessmentPlugin;
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

export const FormAssessmentView = ({
  model,
}: Readonly<FormAssessmentViewProps>) => {
  const stats = model?.stats;

  const issues = useMemo(() => {
    if (!stats) return [];
    const list: {
      title: string;
      description: string;
      severity: string;
      url?: string;
    }[] = [];

    if (stats.uncompressedSize > 1024 * 1024) {
      list.push({
        title: "Large JSON Size",
        description: `The form JSON is ${formatSize(stats.uncompressedSize)}, which may impact load times.`,
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

    if (stats.maxDropdownChoicesCount > 200) {
      list.push({
        title: "Large Dropdown Choices",
        description: `A dropdown has ${formatNumber(stats.maxDropdownChoicesCount)} choices. Consider using a searchable dropdown, RESTful choices (choicesByUrl), or a different input type.`,
        severity: "info",
      });
    }

    const choicesJsonThreshold = 100 * 1024;
    const maxSingleChoicesThreshold = 50 * 1024;
    if (
      stats.totalChoicesJsonSize > choicesJsonThreshold ||
      stats.maxChoicesJsonSize > maxSingleChoicesThreshold
    ) {
      list.push({
        title: "Consider RESTful choices",
        description: `Choices in the form JSON use ${formatSize(stats.totalChoicesJsonSize)} total (largest single: ${formatSize(stats.maxChoicesJsonSize)}). For large option sets, use choicesByUrl to load choices from a REST API and reduce form size and load time.`,
        severity: "info",
        url: "https://surveyjs.io/form-library/documentation/api-reference/choicesrestful",
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
        No assessment data available.
      </div>
    );
  }

  const requiresReCaptcha = model.requiresReCaptcha;
  const isPublic = model.isPublic;

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

  if (!stats) {
    return (
      <div className="flex flex-col items-center gap-2 p-6 text-center text-muted-foreground">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        Analyzing form...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background p-6">
      <Card className="mx-auto max-w-6xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Layers className="h-6 w-6" />
            Form Assessment
          </CardTitle>
          <CardDescription className="text-sm">
            Real-time analysis of your form structure and potential performance
            issues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h4 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Size and Complexity
            </h4>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-5">
              <div className="flex flex-col gap-1.5 rounded-lg border bg-card p-4">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <FileJson className="h-4 w-4" /> JSON Size
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
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Dropdown & choices
            </h4>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-5">
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
                      : "—"}
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
                          RESTful choices (ChoicesRestful) →
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
                No significant issues detected in the form structure.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export function FormAssessmentTab(props: any) {
  const data = props.data;

  const model =
    data instanceof FormAssessmentPlugin ? data : data?.model || data;

  if (!model || !model.stats) {
    return (
      <div className="p-6 text-center text-destructive">
        Error: Assessment data not initialized correctly. (Data:{" "}
        {data ? "present" : "missing"}, Model/Stats:{" "}
        {model?.stats ? "present" : "missing"})
      </div>
    );
  }

  return <FormAssessmentView model={model} />;
}

let isRegistered = false;
export function registerFormAssessmentTab() {
  if (isRegistered) return;

  ReactElementFactory.Instance.registerElement(
    "svc-tab-form-assessment",
    (props: any) => {
      return <FormAssessmentTab {...props} />;
    },
  );
  isRegistered = true;
  console.debug("[FormAssessmentTab] Registered svc-tab-form-assessment");
}
