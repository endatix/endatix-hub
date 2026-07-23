"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SubmissionExportListFilters } from "../../export-url";
import {
  useExportDialog,
  type ExportDialogSubmitArgs,
} from "../use-export-dialog.hook";
import type { TenantExportOptionGroup } from "../map-tenant-export-options";
import { ExportDialogActions } from "./export-dialog-actions";
import { ExportDialogFiltersForm } from "./export-dialog-filters-form";
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
    <Dialog open={open} onOpenChange={dialog.handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={!dialog.busy}
        onInteractOutside={(event) => {
          if (dialog.busy) {
            event.preventDefault();
          }
        }}
        onEscapeKeyDown={(event) => {
          if (dialog.busy) {
            event.preventDefault();
          }
        }}
        onOpenAutoFocus={(event) => {
          const exportButton = dialog.exportButtonRef.current;
          // Export submit is absent for prepare CTA and disabled while checking —
          // let Radix autofocus the first interactive control in those cases.
          if (!exportButton || exportButton.disabled) {
            return;
          }

          event.preventDefault();
          exportButton.focus();
        }}
      >
        <form onSubmit={dialog.handleSubmit} className="flex flex-col gap-5">
          <DialogHeader className="gap-2">
            <DialogTitle>Export submissions</DialogTitle>
            <DialogDescription>{dialog.description}</DialogDescription>
          </DialogHeader>

          <ExportDialogStatusPanel
            phase={dialog.phase}
            inlineError={dialog.inlineError}
            prepareSuccessSummary={dialog.prepareSuccessSummary}
          />

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
              onCompletionStatusChange={(completionStatus) =>
                dialog.patchFilterDraft({ completionStatus })
              }
              onIncludeTestChange={(includeTestSubmissions) =>
                dialog.patchFilterDraft({ includeTestSubmissions })
              }
              onDateRangeChange={dialog.setDateRange}
            />
          ) : null}

          <ExportDialogActions
            phase={dialog.phase}
            busy={dialog.busy}
            isExporting={isExporting}
            showPrepareCta={dialog.showPrepareCta}
            canExport={Boolean(dialog.selectedOption)}
            exportButtonRef={dialog.exportButtonRef}
            onClose={() => onOpenChange(false)}
            onCancel={() => dialog.handleOpenChange(false)}
            onPrepare={() => void dialog.handlePrepare()}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
