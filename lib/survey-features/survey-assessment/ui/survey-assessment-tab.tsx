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
  Info,
  Layers,
  FileJson,
  Image as ImageIcon,
  Zap,
  ListTodo,
  FileUp,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ReactElementFactory } from "survey-react-ui";
import { SurveyAssessmentPlugin } from "../survey-assessment-plugin";
import { useBase } from "@/lib/survey-extensions/ui/use-base";

export function useSurveyAssessmentStats(model: SurveyAssessmentPlugin) {
  return useBase(model);
}

interface SurveyAssessmentViewProps {
  model: SurveyAssessmentPlugin;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export const SurveyAssessmentView = ({
  model,
}: Readonly<SurveyAssessmentViewProps>) => {
  // const assessment = model; //useSurveyAssessmentStats(model);
  const stats = model?.stats;

  const issues = useMemo(() => {
    if (!stats) return [];
    const list: { title: string; description: string; severity: string }[] = [];

    if (stats.uncompressedSize > 1024 * 1024) {
      list.push({
        title: "Large JSON Size",
        description: `The survey JSON is ${formatSize(stats.uncompressedSize)}, which may impact load times.`,
        severity: "warning",
      });
    }

    if (stats.totalQuestions > 100) {
      list.push({
        title: "High Question Count",
        description: `The survey contains ${stats.totalQuestions} questions. Consider splitting it into multiple pages or surveys if possible.`,
        severity: "info",
      });
    }

    if (stats.embeddedImagesCount > 5) {
      list.push({
        title: "Embedded Images Detected",
        description: `Found ${stats.embeddedImagesCount} base64 embedded images. This significantly increases JSON size. Use external URLs if possible.`,
        severity: "warning",
      });
    }

    if (stats.logicConditionsCount > 50) {
      list.push({
        title: "Complex Logic Found",
        description: `The survey has ${stats.logicConditionsCount} logic conditions. This might affect client-side performance.`,
        severity: "warning",
      });
    }

    if (stats.maxDropdownChoicesCount > 200) {
      list.push({
        title: "Large Dropdown Choices",
        description: `A dropdown has ${formatNumber(stats.maxDropdownChoicesCount)} choices. Consider using a searchable dropdown or a different input type.`,
        severity: "info",
      });
    }

    if (stats.fileUploadWithoutBlobCount > 0) {
      list.push({
        title: "File Upload without Blob Storage",
        description: `${stats.fileUploadWithoutBlobCount} file upload questions are storing data as text in the JSON. This can lead to massive submission sizes.`,
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
        Analyzing survey...
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-background p-6">
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Survey Assessment
          </CardTitle>
          <CardDescription>
            Real-time analysis of your survey structure and potential
            performance issues.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileJson className="h-3 w-3" /> JSON Size
              </span>
              <span className="text-lg font-semibold">
                {formatSize(stats.uncompressedSize)}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ListTodo className="h-3 w-3" /> Questions
              </span>
              <span className="text-lg font-semibold">
                {stats.totalQuestions}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <ImageIcon className="h-3 w-3" /> Images
              </span>
              <span className="text-lg font-semibold">
                {stats.embeddedImagesCount}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Zap className="h-3 w-3" /> Logic conditions
              </span>
              <span className="text-lg font-semibold">
                {stats.logicConditionsCount}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <EyeOff className="h-3 w-3" /> Hidden (invisible)
              </span>
              <span className="text-lg font-semibold">
                {stats.invisibleLogicItemsCount.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                Dropdowns
              </span>
              <span className="text-lg font-semibold">
                {stats.dropdownCount}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                Choices (Max)
              </span>
              <span className="text-lg font-semibold">
                {stats.maxDropdownChoicesCount}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileUp className="h-3 w-3" /> File Uploads
              </span>
              <span className="text-lg font-semibold">
                {stats.fileUploadCount}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                {requiresReCaptcha ? (
                  <ShieldCheck className="h-3 w-3 text-green-500" />
                ) : (
                  <ShieldX className="h-3 w-3 text-muted-foreground" />
                )}{" "}
                reCAPTCHA
              </span>
              <span className="text-lg font-semibold">
                {requiresReCaptcha ? "Enabled" : "Disabled"}
              </span>
            </div>
          </div>

          {issues.length > 0 ? (
            <div className="space-y-3 pt-2">
              <h4 className="flex items-center gap-2 text-sm font-medium">
                Potential Issues{" "}
                <Badge variant="secondary">{issues.length}</Badge>
              </h4>
              {issues.map((issue, index) => (
                <Alert key={index} className={getSeverityColor(issue.severity)}>
                  {getSeverityIcon(issue.severity)}
                  <AlertTitle className="text-sm font-semibold">
                    {issue.title}
                  </AlertTitle>
                  <AlertDescription className="text-xs opacity-90">
                    {issue.description}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          ) : (
            <Alert className="border-green-200 bg-green-50 text-green-600 dark:border-green-800 dark:bg-green-950/20 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>All Good!</AlertTitle>
              <AlertDescription>
                No significant issues detected in the survey structure.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export function SurveyAssessmentTab(props: any) {
  // SurveyJS might pass the plugin as 'plugin' or 'data'.
  // Since we pass 'plugin' as the 'data' prop in addTab, we should find our model there.
  const data = props.data;

  console.debug("[SurveyAssessmentTab] Rendered with props:", {
    hasData: !!data,
    dataType: typeof data,
    hasStats: !!data?.stats,
    props: Object.keys(props),
  });

  // Check if data is our SurveyAssessmentPlugin instance
  const model =
    data instanceof SurveyAssessmentPlugin ? data : data?.model || data;

  if (!model || !model.stats) {
    return (
      <div className="p-6 text-center text-destructive">
        Error: Assessment data not initialized correctly. (Data:{" "}
        {data ? "present" : "missing"}, Model/Stats:{" "}
        {model?.stats ? "present" : "missing"})
      </div>
    );
  }

  return <SurveyAssessmentView model={model} />;
}

let isRegistered = false;
export function registerSurveyAssessmentTab() {
  if (isRegistered) return;

  ReactElementFactory.Instance.registerElement(
    "svc-tab-assessment",
    (props: any) => {
      return <SurveyAssessmentTab {...props} />;
    },
  );
  isRegistered = true;
  console.debug("[SurveyAssessmentTab] Registered svc-tab-assessment");
}
function formatNumber(maxDropdownChoicesCount: any) {
  throw new Error("Function not implemented.");
}

