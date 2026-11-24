import type { RefObject, SubmitEvent } from "react";
import type { IncompleteRefreshOutcome } from "./refresh-incomplete-submissions.action";
import type { PrepareFailure } from "./use-prepare-attempt.hook";
import type { AttachmentSelection } from "./retained-attachment";
import type { SubmissionExportListFilters } from "../export-url";
import type { ExportDialogPhase, PrepareOutcome } from "./export-dialog-phase";
import type {
  TenantExportOption,
  TenantExportOptionGroup,
} from "./map-tenant-export-options";
import type {
  ExportFilterDraft,
  ExportFilterRangeErrors,
} from "./export-dialog-filters";
export type ExportDialogSubmitArgs = {
  formatKey: string;
  exportName: string;
  exportFormatId: string;
  fallbackExtension: string;
  filters: SubmissionExportListFilters;
};

export type UseExportDialogArgs = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formId: string;
  groups: TenantExportOptionGroup[];
  listFilters?: SubmissionExportListFilters;
  /** The user may edit forms, so may rebuild reporting data from scratch. */
  canRebuild: boolean;
  isExporting: boolean;
  onExport: (
    args: ExportDialogSubmitArgs,
  ) => Promise<{ succeeded: boolean; message?: string }>;
};

export type UseExportDialogResult = {
  retainedSelection: AttachmentSelection | null;
  prepareFailure: PrepareFailure | null;
  phase: ExportDialogPhase;
  includingIncomplete: boolean;
  /** Set after an export that refreshed incomplete submissions first. */
  incompleteRefresh: IncompleteRefreshOutcome | null;
  description: string;
  busy: boolean;
  controlsLocked: boolean;
  rebuildMode: boolean;
  showFiltersForm: boolean;
  showPrepareCta: boolean;
  showPrepareOptions: boolean;
  showRebuildEntry: boolean;
  showBackToExport: boolean;
  showExportSubmit: boolean;
  showGroupLabels: boolean;
  inlineError: string | null;
  prepareOutcome: PrepareOutcome | null;
  fullRecompile: boolean;
  setFullRecompile: (fullRecompile: boolean) => void;
  exportFormatId: string;
  setExportFormatId: (id: string) => void;
  options: TenantExportOption[];
  selectedOption: TenantExportOption | undefined;
  showRowFilters: boolean;
  showLocaleField: boolean;
  showCompletedAt: boolean;
  filterDraft: ExportFilterDraft;
  rangeErrors: ExportFilterRangeErrors;
  localeSelectOptions: ReadonlyArray<{ value: string; label: string }>;
  localeSelectValue: string;
  exportButtonRef: RefObject<HTMLButtonElement | null>;
  handleOpenChange: (nextOpen: boolean) => void;
  enterRebuildMode: () => void;
  exitRebuildMode: () => void;
  handlePrepare: () => Promise<void>;
  handleSubmit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>;
  patchFilterDraft: (patch: Partial<ExportFilterDraft>) => void;
  setDateRange: (
    key: "createdAt" | "modifiedAt" | "startedAt" | "completedAt",
    side: "from" | "to",
    value: string,
  ) => void;
  setLocale: (locale: string) => void;
};
