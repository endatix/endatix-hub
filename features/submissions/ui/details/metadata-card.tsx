"use client";

import { LocaleLabel } from "@/components/common/locale-label";
import { StatusBadge } from "@/components/common/status-badge";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getElapsedTimeString,
  getSubmissionStartedAt,
  parseDate,
} from "@/lib/utils";
import {
  catalogLocaleDisplayName,
  DEFAULT_CATALOG_LOCALE,
  fromSurveyModelLocale,
  getSubmissionLocale,
  isLocaleValid,
} from "@/lib/localization";
import { ChevronDown, Languages, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { CellStatusDropdown } from "../table/cell-status-dropdown";
import { useSubmissionDetails } from "./submission-details-context";

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
      <span className="text-[10px] leading-none font-bold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <div className="flex min-h-[28px] items-center">{children}</div>
    </div>
  );
}

function ValueText({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <span className="text-[13px] font-semibold text-foreground">
      {children}
    </span>
  );
}

function SubmissionLanguageMetaCell({
  submittedCatalogLocale,
}: Readonly<{ submittedCatalogLocale: string }>) {
  const { catalogLocales, displayCatalogLocale, setDisplayCatalogLocale } =
    useSubmissionDetails();

  if (catalogLocales.length <= 1) {
    return (
      <MetaCell label="Language">
        <ValueText>
          <LocaleLabel
            catalogLocale={catalogLocales[0] ?? DEFAULT_CATALOG_LOCALE}
          />
        </ValueText>
      </MetaCell>
    );
  }

  return (
    <MetaCell label="Language">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Badge
            asChild
            variant="secondary"
            className="h-7 max-w-full cursor-pointer gap-1 px-2.5 text-xs font-semibold"
          >
            <button type="button">
              <span className="sr-only">Labels shown in </span>
              <LocaleLabel catalogLocale={displayCatalogLocale} />
              <ChevronDown aria-hidden="true" />
            </button>
          </Badge>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          <DropdownMenuLabel
            inset
            className="text-xs font-normal text-muted-foreground"
          >
            Show labels in
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={displayCatalogLocale}
            onValueChange={setDisplayCatalogLocale}
          >
            {catalogLocales.map((locale) => (
              <DropdownMenuRadioItem key={locale} value={locale}>
                <LocaleLabel catalogLocale={locale} />
                {locale === submittedCatalogLocale && (
                  <span className="ml-auto pl-3 text-xs text-muted-foreground">
                    Submitted
                  </span>
                )}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </MetaCell>
  );
}

export function MetadataCard() {
  const {
    submission,
    surveyModel,
    displayCatalogLocale,
    setDisplayCatalogLocale,
  } = useSubmissionDetails();

  const storedLocale = getSubmissionLocale(submission);
  const submittedCatalogLocale =
    surveyModel && isLocaleValid(storedLocale, surveyModel)
      ? fromSurveyModelLocale(storedLocale)
      : DEFAULT_CATALOG_LOCALE;
  const showingOtherLanguage = displayCatalogLocale !== submittedCatalogLocale;
  const submittedName = catalogLocaleDisplayName(submittedCatalogLocale);
  const displayName = catalogLocaleDisplayName(displayCatalogLocale);

  const completionTime =
    submission.isComplete &&
    submission.completedAt &&
    parseDate(submission.completedAt)
      ? getElapsedTimeString(
          getSubmissionStartedAt(submission),
          submission.completedAt,
          "long",
        )
      : DASH_NO_DATA;

  return (
    <section className="mt-8 overflow-hidden rounded-md border border-border/25 bg-surface-container-lowest shadow-sm">
      {submission.isTestSubmission && (
        <Alert className="rounded-none border-0 border-b border-warning bg-warning py-2.5 text-warning-foreground">
          <TriangleAlert />
          <AlertTitle className="text-warning-foreground">
            This is a test submission
          </AlertTitle>
        </Alert>
      )}
      {showingOtherLanguage && (
        <Alert
          variant="info"
          role="status"
          className="rounded-none border-0 border-b py-2.5"
        >
          <Languages />
          <div className="col-start-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <p>
              Labels shown in <strong>{displayName}</strong>. Answers are
              exactly as submitted in <strong>{submittedName}</strong>.
            </p>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={() => setDisplayCatalogLocale(submittedCatalogLocale)}
            >
              Show in {submittedName}
            </Button>
          </div>
        </Alert>
      )}
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
          <StatusBadge
            tone={submission.isComplete ? "on" : "off"}
            label={submission.isComplete ? "Yes" : "No"}
          />
        </MetaCell>
        <MetaCell label="Created at">
          <ValueText>{formatDate(submission.createdAt)}</ValueText>
        </MetaCell>
        <MetaCell label="Last modified">
          <ValueText>{formatDate(submission.modifiedAt)}</ValueText>
        </MetaCell>
        <MetaCell label="Started at">
          <ValueText>{formatDate(submission.startedAt)}</ValueText>
        </MetaCell>
        <MetaCell label="Completed at">
          <ValueText>{formatDate(submission.completedAt)}</ValueText>
        </MetaCell>
        <MetaCell label="Completion time">
          <ValueText>{completionTime}</ValueText>
        </MetaCell>
        <SubmissionLanguageMetaCell
          submittedCatalogLocale={submittedCatalogLocale}
        />
      </div>
    </section>
  );
}
