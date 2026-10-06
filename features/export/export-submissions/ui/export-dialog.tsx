"use client";

import { Button } from "@/components/ui/button";
import {
  ResponsivePanel,
  ResponsivePanelBody,
  ResponsivePanelDescription,
  ResponsivePanelHeader,
  ResponsivePanelTitle,
} from "@/components/ui/responsive-panel";
import type { SubmissionExportListFilters } from "../../export-url";
import {
  useExportDialog,
  type ExportDialogSubmitArgs,
} from "../use-export-dialog.hook";
import type { TenantExportOptionGroup } from "../map-tenant-export-options";
import { ExportDialogActions } from "./export-dialog-actions";
import { ExportDialogFiltersForm } from "./export-dialog-filters-form";
import { ExportDialogPrepareOptions } from "./export-dialog-prepare-options";
import { ExportDialogStatusPanel } from "./export-dialog-status-panel";

interface ExportSubmissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  /** Grouped by export target (Submissions / Codebook) — same grouping as the former dropdown. */
  groups: TenantExportOptionGroup[];
  listFilters?: SubmissionExportListFilters;
  isExporting: boolean;
  onExport: (
    args: ExportDialogSubmitArgs,
  ) => Promise<{ succeeded: boolean; message?: string }>;
}

export function ExportSubmissionsDialog({
  open,
  onOpenChange,
  formId,
  groups,
  listFilters,
  isExporting,
  onExport,
}: Readonly<ExportSubmissionsDialogProps>) {
  const dialog = useExportDialog({
    open,
    onOpenChange,
    formId,
    groups,
    listFilters,
    isExporting,
    onExport,
  });

  return (
    <ResponsivePanel
      open={open}
      onOpenChange={dialog.handleOpenChange}
      desktopType="complex"
      dismissible={!dialog.busy}
      onOpenAutoFocus={(event) => {
        const exportButton = dialog.exportButtonRef.current;
        // Land on Export so Enter exports with the prefilled choices. It is
        // absent for the prepare CTA and disabled while checking; let Radix
        // focus the first control then.
        if (!exportButton || exportButton.disabled) {
          return;
        }

        event.preventDefault();
        exportButton.focus();
      }}
      sheetContentClassName="flex h-full flex-col"
      drawerContentClassName="flex flex-col"
    >
      <form
        onSubmit={dialog.handleSubmit}
        className="flex min-h-0 flex-1 flex-col"
      >
        <ResponsivePanelHeader className="gap-2">
          <ResponsivePanelTitle>Export submissions</ResponsivePanelTitle>
          <ResponsivePanelDescription aria-live="polite">
            {dialog.description}
          </ResponsivePanelDescription>
        </ResponsivePanelHeader>

        <ResponsivePanelBody>
          <ExportDialogStatusPanel
            phase={dialog.phase}
            rebuildMode={dialog.rebuildMode}
            inlineError={dialog.inlineError}
            prepareOutcome={dialog.prepareOutcome}
            incompleteRefresh={dialog.incompleteRefresh}
            exportName={dialog.selectedOption?.label}
          />

          {dialog.showPrepareOptions ? (
            <ExportDialogPrepareOptions
              fullRecompile={dialog.fullRecompile}
              onFullRecompileChange={dialog.setFullRecompile}
              disabled={dialog.busy}
            />
          ) : null}

          {dialog.showFiltersForm ? (
            <ExportDialogFiltersForm
              groups={groups}
              showGroupLabels={dialog.showGroupLabels}
              exportFormatId={dialog.exportFormatId}
              onExportFormatIdChange={dialog.setExportFormatId}
              controlsLocked={dialog.controlsLocked}
              optionsEmpty={dialog.options.length === 0}
              showLocaleField={dialog.showLocaleField}
              localeSelectValue={dialog.localeSelectValue}
              localeSelectOptions={dialog.localeSelectOptions}
              onLocaleChange={dialog.setLocale}
              showRowFilters={dialog.showRowFilters}
              filterDraft={dialog.filterDraft}
              rangeErrors={dialog.rangeErrors}
              showCompletedAt={dialog.showCompletedAt}
              onCollectionStatusChange={(values) =>
                dialog.patchFilterDraft({ collectionStatus: [...values] })
              }
              onIncludeTestChange={(includeTestSubmissions) =>
                dialog.patchFilterDraft({ includeTestSubmissions })
              }
              onDateRangeChange={dialog.setDateRange}
            />
          ) : null}

          {dialog.showRebuildEntry ? (
            <div className="flex justify-start">
              {/* An action, so a quiet ghost button — not a link. */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-3 text-muted-foreground"
                onClick={dialog.enterRebuildMode}
                disabled={dialog.busy}
              >
                Rebuild reporting data…
              </Button>
            </div>
          ) : null}
        </ResponsivePanelBody>

        <ExportDialogActions
          phase={dialog.phase}
          busy={dialog.busy}
          isExporting={isExporting}
          showPrepareCta={dialog.showPrepareCta}
          showExportSubmit={dialog.showExportSubmit}
          showBackToExport={dialog.showBackToExport}
          canExport={Boolean(dialog.selectedOption)}
          includingIncomplete={dialog.includingIncomplete}
          exportButtonRef={dialog.exportButtonRef}
          onClose={() => onOpenChange(false)}
          onCancel={() => dialog.handleOpenChange(false)}
          onBackToExport={dialog.exitRebuildMode}
          onPrepare={() => void dialog.handlePrepare()}
        />
      </form>
    </ResponsivePanel>
  );
}

export type { ExportSubmissionsDialogProps };
