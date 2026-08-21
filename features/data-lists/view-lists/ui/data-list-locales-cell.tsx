"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatLocaleLabel } from "@/features/data-lists/translations/locale-discovery";
import { cn } from "@/lib/utils";
import { useState } from "react";

const DEFAULT_VISIBLE_COUNT = 3;

export type DataListLocalesCellProps = {
  defaultLocale?: string;
  availableLocales?: readonly string[];
  /** Max culture keys shown before +N expand. */
  visibleCount?: number;
  className?: string;
};

export function DataListLocalesCell({
  defaultLocale,
  availableLocales = [],
  visibleCount = DEFAULT_VISIBLE_COUNT,
  className,
}: Readonly<DataListLocalesCellProps>) {
  const [expanded, setExpanded] = useState(false);

  const extras = availableLocales.filter(
    (locale) =>
      !defaultLocale ||
      locale.trim().toLowerCase() !== defaultLocale.trim().toLowerCase(),
  );
  const allKeys = [
    ...(defaultLocale ? [defaultLocale] : []),
    ...extras,
  ];

  if (allKeys.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const hiddenCount = Math.max(0, allKeys.length - visibleCount);
  const shown = expanded ? allKeys : allKeys.slice(0, visibleCount);

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-1",
        expanded ? "flex-wrap" : "flex-nowrap",
        className,
      )}
    >
      <TooltipProvider delayDuration={200}>
        {shown.map((locale) => {
          const isDefault =
            Boolean(defaultLocale) &&
            locale.trim().toLowerCase() ===
              defaultLocale!.trim().toLowerCase();
          return (
            <Tooltip key={locale}>
              <TooltipTrigger asChild>
                <Badge
                  variant={isDefault ? "secondary" : "outline"}
                  className="shrink-0 font-mono text-[0.7rem] uppercase tracking-wide"
                >
                  {locale}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <span className="text-xs">{formatLocaleLabel(locale)}</span>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
      {hiddenCount > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 shrink-0 px-1.5 text-xs text-muted-foreground"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setExpanded((value) => !value);
          }}
          aria-expanded={expanded}
          aria-label={
            expanded
              ? "Show fewer locales"
              : `Show ${hiddenCount} more locales`
          }
        >
          {expanded ? "Less" : `+${hiddenCount}`}
        </Button>
      ) : null}
    </div>
  );
}
