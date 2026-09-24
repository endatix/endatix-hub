"use client";

import { LocaleLabel } from "@/components/common/locale-label";
import { Alert } from "@/components/ui/alert";
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
import { catalogLocaleEnglishName } from "@/lib/localization";
import { ChevronDown, Languages } from "lucide-react";
import { useSubmissionDetails } from "./submission-details-context";

/** Label-language picker for a multi-language survey (DESIGN.md §6 “View-only choices”). */
export function LabelLanguagePicker() {
  const {
    catalogLocales,
    displayCatalogLocale,
    setDisplayCatalogLocale,
    submittedCatalogLocale,
  } = useSubmissionDetails();

  return (
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
  );
}

/** Info strip shown while labels differ from the submitted language. */
export function LabelLanguageNotice() {
  const {
    displayCatalogLocale,
    setDisplayCatalogLocale,
    submittedCatalogLocale,
  } = useSubmissionDetails();

  if (displayCatalogLocale === submittedCatalogLocale) {
    return null;
  }

  const submittedName = catalogLocaleEnglishName(submittedCatalogLocale);
  const displayName = catalogLocaleEnglishName(displayCatalogLocale);

  return (
    <Alert
      variant="info"
      role="status"
      className="rounded-none border-0 border-b py-2.5"
    >
      <Languages />
      <div className="col-start-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p>
          Labels shown in <strong>{displayName}</strong>. Answers are exactly as
          submitted in <strong>{submittedName}</strong>.
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
  );
}
