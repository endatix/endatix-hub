"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getElapsedTimeString, parseDate } from "@/lib/utils";
import { Info } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import {
  getLanguageDisplayName,
  getSubmissionLocale,
} from "../../submission-localization";
import { CellStatusDropdown } from "../table/cell-status-dropdown";
import {
  useSubmissionDetails,
  useSubmissionDetailsViewOptions,
} from "./submission-details-context";

const DASH_NO_DATA = "—";

const formatDate = (date?: Date): string => {
  if (!date) {
    return DASH_NO_DATA;
  }

  const parsedDate = parseDate(date);
  if (!parsedDate) {
    return DASH_NO_DATA;
  }

  return parsedDate.toLocaleString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour12: true,
  });
};

/** 1px hairlines via gap; faint in light mode; dark theme uses neutral (not --border blue) */
const metadataGridHairline = "bg-border/10 dark:bg-foreground/8";

interface MetaCellProps {
  label: string;
  children: ReactNode;
}

function MetaCell({ label, children }: Readonly<MetaCellProps>) {
  return (
    <div className="flex h-full flex-col justify-between gap-3 bg-surface-container-lowest p-4 sm:p-6">
      <span className="text-[10px] leading-none font-bold tracking-widest text-slate-500 uppercase">
        {label}
      </span>
      <div className="flex min-h-[28px] items-center">{children}</div>
    </div>
  );
}

function ValueText({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="text-[13px] font-semibold text-slate-900">{children}</span>
  );
}

export function MetadataCard() {
  const { submission } = useSubmissionDetails();
  const { viewOptions } = useSubmissionDetailsViewOptions();
  const rawLocale = getSubmissionLocale(submission);
  const hasStoredLocale = Boolean(rawLocale?.trim());
  const languageLabel = hasStoredLocale
    ? (getLanguageDisplayName(rawLocale) ?? rawLocale)
    : "default";
  const isUsingSubmissionLanguage = viewOptions.useSubmissionLanguage;

  const languageTooltip = useMemo(() => {
    if (!hasStoredLocale) {
      return "No locale is stored for this submission; the default language is used.";
    }

    if (isUsingSubmissionLanguage) {
      return "Displaying in submission language";
    }

    return `Switch to "${getLanguageDisplayName(rawLocale) ?? rawLocale}" in View menu`;
  }, [hasStoredLocale, isUsingSubmissionLanguage, rawLocale]);

  const completionTime =
    submission.isComplete &&
    submission.completedAt &&
    parseDate(submission.completedAt)
      ? getElapsedTimeString(
          submission.createdAt,
          submission.completedAt,
          "long",
        )
      : DASH_NO_DATA;

  return (
    <section className="mt-8 overflow-hidden rounded-xl border border-border/25 bg-surface-container-lowest shadow-sm">
      <div className={`flex flex-col gap-px ${metadataGridHairline}`}>
        <div
          className={`grid grid-cols-2 gap-px lg:grid-cols-4 ${metadataGridHairline}`}
        >
          <MetaCell label="Status">
            <CellStatusDropdown
              code={submission.status}
              submissionId={submission.id}
              formId={submission.formId}
            />
          </MetaCell>
          <MetaCell label="Is Complete">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700">
              {submission.isComplete ? "Yes" : "No"}
            </span>
          </MetaCell>
          <MetaCell label="Created at">
            <ValueText>{formatDate(submission.createdAt)}</ValueText>
          </MetaCell>
          <MetaCell label="Completed at">
            <ValueText>{formatDate(submission.completedAt)}</ValueText>
          </MetaCell>
        </div>

        <div
          className={`grid grid-cols-2 gap-px lg:grid-cols-4 ${metadataGridHairline}`}
        >
          <MetaCell label="Completion time">
            <ValueText>{completionTime}</ValueText>
          </MetaCell>
          <MetaCell label="Last modified">
            <ValueText>{formatDate(submission.modifiedAt)}</ValueText>
          </MetaCell>
          <MetaCell label="Submission language">
            <span className="inline-flex min-w-0 items-center gap-2">
              <ValueText>{languageLabel}</ValueText>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="shrink-0 cursor-help rounded-full text-slate-400 transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                      aria-label="Submission language info"
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-sm">{languageTooltip}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </span>
          </MetaCell>
          <MetaCell label="">
            <span className="text-[13px] font-semibold select-none"> </span>
          </MetaCell>
        </div>
      </div>
    </section>
  );
}
