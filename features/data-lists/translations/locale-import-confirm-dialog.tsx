"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DEFAULT_CATALOG_LOCALE } from "@/lib/localization";
import { useEffect, useMemo, useState } from "react";
import {
  DATA_LIST_MAX_ITEMS,
  DATA_LIST_MAX_LABEL_LENGTH,
  DATA_LIST_MAX_LOCALES,
  buildDefaultLocaleSelection,
  formatLocaleLabel,
  resolveLocaleImportSelection,
  type LocaleColumnDiscovery,
  type LocaleColumnKind,
  type LocaleImportDiscovery,
  type LocaleImportSelection,
} from "./locale-discovery";

export type LocaleImportConfirmPanelProps = {
  title?: string;
  /** Create flow avoids “replace existing” copy; replace keeps current wording. */
  mode?: "create" | "replace";
  discovery: LocaleImportDiscovery | null;
  catalogLocaleCount: number;
  isPending?: boolean;
  onCancel: () => void;
  onConfirm: (selection: LocaleImportSelection) => void;
};

const MODE_COPY = {
  create: {
    description:
      "Review locale columns to import. New locales can still be turned off before the list is created.",
    rowOutcome: "will become the items in the new list.",
  },
  replace: {
    description:
      "Review locale columns to import. Existing catalog locales stay selected for now (removing them during upload can leave empty labels). New locales can still be turned off. This replaces the entire list.",
    rowOutcome: "will replace existing items.",
  },
} as const;

const COLUMN_KIND_HINT: Record<LocaleColumnKind, string> = {
  default: "required",
  existing: "already in catalog (required for now)",
  new: "will be added to catalog",
  invalid: "",
};

const EMPTY_SELECTION = {
  selection: { ensureLocales: [], includedLocales: [] as string[] },
  errors: [] as string[],
};

function uniqueSelectableColumns(
  columns: LocaleColumnDiscovery[],
): LocaleColumnDiscovery[] {
  const seen = new Set<string>();
  return columns.filter((column) => {
    if (!column.key || column.kind === "invalid" || seen.has(column.key)) {
      return false;
    }
    seen.add(column.key);
    return true;
  });
}

/**
 * Locale selection UI shared by create/replace wizards (embedded) and optional dialog shell.
 */
export function LocaleImportConfirmPanel({
  title = "Confirm import",
  mode = "replace",
  discovery,
  catalogLocaleCount,
  isPending = false,
  onCancel,
  onConfirm,
}: Readonly<LocaleImportConfirmPanelProps>) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const copy = MODE_COPY[mode];

  useEffect(() => {
    setSelected(discovery ? buildDefaultLocaleSelection(discovery) : {});
  }, [discovery]);

  const { selection, errors: selectionErrors } = useMemo(() => {
    if (!discovery) {
      return EMPTY_SELECTION;
    }

    return resolveLocaleImportSelection(
      discovery,
      selected,
      catalogLocaleCount,
    );
  }, [catalogLocaleCount, discovery, selected]);

  const canConfirm =
    discovery?.canProceed === true &&
    discovery.invalidLocales.length === 0 &&
    discovery.structuralErrors.length === 0 &&
    selectionErrors.length === 0 &&
    selection.includedLocales.includes(DEFAULT_CATALOG_LOCALE);

  const selectableColumns = useMemo(
    () => (discovery ? uniqueSelectableColumns(discovery.columns) : []),
    [discovery],
  );

  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-1">
        <p className="text-base leading-none font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{copy.description}</p>
      </div>

      {discovery ? (
        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p>
              Rows: {discovery.rowCount.toLocaleString()} /{" "}
              {DATA_LIST_MAX_ITEMS.toLocaleString()}
            </p>
            <p>
              Catalog locales after import: up to{" "}
              {Math.min(
                catalogLocaleCount + selection.ensureLocales.length,
                DATA_LIST_MAX_LOCALES,
              )}{" "}
              / {DATA_LIST_MAX_LOCALES}
            </p>
            <p>
              Label max length: {DATA_LIST_MAX_LABEL_LENGTH.toLocaleString()}
            </p>
          </div>

          <p>
            <span className="font-medium">
              {discovery.rowCount.toLocaleString()}
            </span>{" "}
            row
            {discovery.rowCount === 1 ? "" : "s"} {copy.rowOutcome}
          </p>

          {discovery.structuralErrors.length > 0 ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-destructive">
              <p className="font-medium">Cannot import</p>
              <ul className="mt-1 list-disc pl-5">
                {discovery.structuralErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {discovery.invalidLocales.length > 0 ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-destructive">
              <p className="font-medium">Invalid locale columns</p>
              <p className="mt-1">{discovery.invalidLocales.join(", ")}</p>
            </div>
          ) : null}

          {selectionErrors.length > 0 ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-destructive">
              <ul className="list-disc pl-5">
                {selectionErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {selectableColumns.length > 0 ? (
            <div className="space-y-2">
              <p className="font-medium">Locale columns</p>
              <ul className="space-y-2">
                {selectableColumns.map((column) => {
                  // Temporary: existing catalog locales cannot be deselected —
                  // dropping them on replace can leave empty labels in catalog.
                  const locked =
                    column.kind === "default" || column.kind === "existing";
                  const checked = locked || selected[column.key] !== false;

                  return (
                    <li key={column.key} className="flex items-start gap-2">
                      <Checkbox
                        id={`locale-column-${column.key}`}
                        checked={checked}
                        disabled={isPending || locked}
                        onCheckedChange={(value) => {
                          setSelected((prev) => ({
                            ...prev,
                            [column.key]: value === true,
                          }));
                        }}
                      />
                      <div className="space-y-0.5">
                        <Label htmlFor={`locale-column-${column.key}`}>
                          {column.key === DEFAULT_CATALOG_LOCALE
                            ? "default"
                            : formatLocaleLabel(column.key)}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {COLUMN_KIND_HINT[column.kind]}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" disabled={isPending} onClick={onCancel}>
          Back
        </Button>
        <Button
          disabled={!canConfirm || isPending}
          onClick={() => onConfirm(selection)}
        >
          {isPending ? "Importing…" : "Confirm import"}
        </Button>
      </div>
    </div>
  );
}
