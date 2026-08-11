"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useEffect, useMemo, useState } from "react";
import {
  DATA_LIST_MAX_ITEMS,
  DATA_LIST_MAX_LABEL_LENGTH,
  DATA_LIST_MAX_LOCALES,
  DEFAULT_LABEL_KEY,
  buildDefaultLocaleSelection,
  formatLocaleLabel,
  resolveLocaleImportSelection,
  type LocaleImportDiscovery,
  type LocaleImportSelection,
} from "./locale-discovery";

export type LocaleImportConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  discovery: LocaleImportDiscovery | null;
  catalogLocaleCount: number;
  isPending?: boolean;
  onConfirm: (selection: LocaleImportSelection) => void;
};

export function LocaleImportConfirmDialog({
  open,
  onOpenChange,
  title = "Confirm import",
  discovery,
  catalogLocaleCount,
  isPending = false,
  onConfirm,
}: Readonly<LocaleImportConfirmDialogProps>) {
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSelected(discovery ? buildDefaultLocaleSelection(discovery) : {});
  }, [discovery]);

  const { selection, errors: selectionErrors } = useMemo(() => {
    if (!discovery) {
      return {
        selection: { ensureLocales: [], includedLocales: [] },
        errors: [] as string[],
      };
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
    selection.includedLocales.includes(DEFAULT_LABEL_KEY);

  const selectableColumns = useMemo(() => {
    if (!discovery) {
      return [];
    }

    const seen = new Set<string>();
    const columns = [];
    for (const column of discovery.columns) {
      if (!column.key || column.kind === "invalid" || seen.has(column.key)) {
        continue;
      }
      seen.add(column.key);
      columns.push(column);
    }
    return columns;
  }, [discovery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Review locale columns to import. Existing catalog locales stay
            selected for now (removing them during upload can leave empty
            labels). New locales can still be turned off. This replaces the
            entire list.
          </DialogDescription>
        </DialogHeader>

        {discovery ? (
          <div className="space-y-4 text-sm">
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
              <p>Label max length: {DATA_LIST_MAX_LABEL_LENGTH}</p>
            </div>

            <p>
              <span className="font-medium">{discovery.rowCount}</span> row
              {discovery.rowCount === 1 ? "" : "s"} will replace existing items.
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
                    let hint = "already in catalog (required for now)";
                    if (column.kind === "default") {
                      hint = "required";
                    } else if (column.kind === "new") {
                      hint = "will be added to catalog";
                    }

                    return (
                      <li key={column.key} className="flex items-start gap-2">
                        <Checkbox
                          id={`locale-column-${column.key}`}
                          checked={checked}
                          disabled={isPending || locked}
                          onCheckedChange={(value) => {
                            if (locked) {
                              return;
                            }
                            setSelected((prev) => ({
                              ...prev,
                              [column.key]: value === true,
                            }));
                          }}
                        />
                        <div className="space-y-0.5">
                          <Label htmlFor={`locale-column-${column.key}`}>
                            {column.key === DEFAULT_LABEL_KEY
                              ? "default"
                              : formatLocaleLabel(column.key)}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {hint}
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

        <DialogFooter>
          <Button
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            disabled={!canConfirm || isPending}
            onClick={() => onConfirm(selection)}
          >
            {isPending ? "Importing…" : "Confirm import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
