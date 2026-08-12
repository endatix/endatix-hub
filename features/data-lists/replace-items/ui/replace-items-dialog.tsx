"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import type { DataListDetails } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { Upload } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { replaceDataListItemsAction } from "../replace-data-list-items.action";
import {
  DataListItemsInput,
  type DataListSourceFormat,
} from "../../add-items/data-list-items-input";
import { DataListValidationPreview } from "../../add-items/data-list-validation-preview";
import { DataListCsvPreview } from "../../add-items/data-list-csv-preview";
import { useDataListSource } from "../../add-items/use-data-list-source.hook";
import { LocaleImportConfirmPanel } from "../../translations/locale-import-confirm-dialog";
import {
  discoverLocalesFromJsonItems,
  filterJsonItemsByLocales,
} from "../../utils";
import { uploadTranslationsCsvAction } from "../../translations/translations-csv.action";
import { filterTranslationsCsv } from "../../translations/parse-translations-csv";
import type {
  LocaleImportDiscovery,
  LocaleImportSelection,
} from "../../translations/locale-discovery";
import type { ParsedValidation } from "../../types";

interface ReplaceItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataListId: string;
  title: string;
  availableLocales?: string[];
  defaultLocale?: string;
  initialFormat?: DataListSourceFormat;
  onReplaced?: (details: DataListDetails) => void;
}

type ReplaceStep = 1 | 2 | 3;

function resolveReplaceStepDescription(
  step: ReplaceStep,
  title: string,
): ReactNode {
  if (step === 2) {
    return "Review the import preview before choosing locales.";
  }

  if (step === 3) {
    return "Choose which locales to import.";
  }

  return (
    <>
      Upload CSV or JSON to replace all items in{" "}
      <span className="font-medium">{title}</span>.
    </>
  );
}

function resolvePendingDiscovery(args: {
  format: DataListSourceFormat;
  validation: ParsedValidation | null;
  csvDiscovery: LocaleImportDiscovery | null;
  availableLocales: string[];
  defaultLocale?: string;
}): LocaleImportDiscovery | null {
  const { format, validation, csvDiscovery, availableLocales, defaultLocale } =
    args;

  if (format === "json" && validation) {
    return discoverLocalesFromJsonItems(validation.validItems, {
      availableLocales,
      defaultLocale,
    });
  }

  if (format === "csv" && csvDiscovery) {
    return csvDiscovery;
  }

  return null;
}

async function runReplaceImport(args: {
  format: DataListSourceFormat;
  dataListId: string;
  csvInput: string;
  validation: ParsedValidation | null;
  selection: LocaleImportSelection;
  defaultLocale?: string;
}): Promise<Result<DataListDetails> | null> {
  const { format, dataListId, csvInput, validation, selection, defaultLocale } =
    args;

  if (format === "csv") {
    return uploadTranslationsCsvAction({
      dataListId,
      csv: filterTranslationsCsv(
        csvInput,
        selection.includedLocales,
        defaultLocale,
      ),
      ensureLocales: selection.ensureLocales,
    });
  }

  if (!validation) {
    return null;
  }

  return replaceDataListItemsAction(
    dataListId,
    filterJsonItemsByLocales(
      validation.validItems,
      selection.includedLocales,
      defaultLocale,
    ),
    selection.ensureLocales,
  );
}

function reportReplaceImportResult(
  importResult: Result<DataListDetails>,
  onReplaced: ((details: DataListDetails) => void) | undefined,
  onOpenChange: (open: boolean) => void,
  failureFallback: string,
): void {
  if (Result.isError(importResult)) {
    toast.error(importResult.message || failureFallback);
    return;
  }

  onReplaced?.(importResult.value);
  onOpenChange(false);
}

interface ReplaceItemsDialogBodyProps {
  step: ReplaceStep;
  format: DataListSourceFormat;
  validation: ParsedValidation | null;
  csvDiscovery: LocaleImportDiscovery | null;
  pendingDiscovery: LocaleImportDiscovery | null;
  displayError: string | null;
  displayWarning: string | null;
  selectedFileName: string | null;
  availableLocalesCount: number;
  isPending: boolean;
  setFormat: (format: DataListSourceFormat) => void;
  onFileSelected: (file: File | null) => Promise<void>;
  setStep: (step: ReplaceStep) => void;
  onConfirmReplace: (selection: LocaleImportSelection) => void;
}

function ReplaceItemsDialogBody(
  props: Readonly<ReplaceItemsDialogBodyProps>,
): ReactNode {
  const {
    step,
    format,
    validation,
    csvDiscovery,
    pendingDiscovery,
    displayError,
    displayWarning,
    selectedFileName,
    availableLocalesCount,
    isPending,
    setFormat,
    onFileSelected,
    setStep,
    onConfirmReplace,
  } = props;

  if (step === 1) {
    return (
      <>
        <DataListItemsInput
          format={format}
          onFormatChange={setFormat}
          onFileSelected={onFileSelected}
          selectedFileName={selectedFileName}
          fileInputId="replace-data-list-file-upload"
        />

        {displayError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {displayError}
          </div>
        ) : null}

        {!displayError && displayWarning ? (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-amber-800 dark:text-amber-300">
            {displayWarning}
          </div>
        ) : null}
      </>
    );
  }

  if (step === 2 && format === "json" && validation) {
    return <DataListValidationPreview validation={validation} />;
  }

  if (step === 2 && format === "csv" && csvDiscovery) {
    return <DataListCsvPreview discovery={csvDiscovery} />;
  }

  if (step === 3) {
    return (
      <LocaleImportConfirmPanel
        title={format === "csv" ? "Confirm CSV import" : "Confirm JSON import"}
        mode="replace"
        discovery={pendingDiscovery}
        catalogLocaleCount={availableLocalesCount}
        isPending={isPending}
        onCancel={() => setStep(2)}
        onConfirm={onConfirmReplace}
      />
    );
  }

  return null;
}

interface ReplaceItemsDialogFooterProps {
  step: ReplaceStep;
  hasSourceContent: boolean;
  canConfirm: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onReviewLocales: () => void;
  setStep: (step: ReplaceStep) => void;
}

function ReplaceItemsDialogFooter(
  props: Readonly<ReplaceItemsDialogFooterProps>,
): ReactNode {
  const {
    step,
    hasSourceContent,
    canConfirm,
    onOpenChange,
    onContinue,
    onReviewLocales,
    setStep,
  } = props;

  if (step === 3) {
    return null;
  }

  return (
    <DialogFooter className="border-t px-6 py-4">
      {step === 2 ? (
        <Button variant="outline" onClick={() => setStep(1)}>
          Back
        </Button>
      ) : (
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      )}

      {step === 1 ? (
        <Button onClick={onContinue} disabled={!hasSourceContent}>
          Continue
        </Button>
      ) : (
        <Button onClick={onReviewLocales} disabled={!canConfirm}>
          <Upload className="h-4 w-4" />
          Review locales
        </Button>
      )}
    </DialogFooter>
  );
}

/**
 * Replace all items via CSV or JSON upload.
 * Step 1: source · Step 2: preview · Step 3: locale confirm.
 */
export function ReplaceItemsDialog({
  open,
  onOpenChange,
  dataListId,
  title,
  availableLocales = [],
  defaultLocale,
  initialFormat = "json",
  onReplaced,
}: Readonly<ReplaceItemsDialogProps>) {
  const [step, setStep] = useState<ReplaceStep>(1);
  const [isPending, startTransition] = useTransition();
  const [pendingDiscovery, setPendingDiscovery] =
    useState<LocaleImportDiscovery | null>(null);
  const advanceAfterUploadRef = useRef(false);

  const {
    format,
    setFormat,
    csvInput,
    validation,
    csvDiscovery,
    canConfirm,
    hasSourceContent,
    sourceError,
    sourceWarning,
    validationError: fileValidationError,
    selectedFileName,
    setValidationError,
    handleFileSelected,
    reset: resetFileHandler,
  } = useDataListSource({
    availableLocales,
    defaultLocale,
    initialFormat,
  });

  const displayError = fileValidationError ?? sourceError;
  const displayWarning = displayError ? null : sourceWarning;

  const handleFileSelectedWithAdvance = async (
    file: File | null,
  ): Promise<void> => {
    advanceAfterUploadRef.current = true;
    await handleFileSelected(file);
  };

  useEffect(() => {
    if (!open) {
      resetFileHandler();
      setStep(1);
      setPendingDiscovery(null);
      advanceAfterUploadRef.current = false;
    }
  }, [open, resetFileHandler]);

  useEffect(() => {
    if (!advanceAfterUploadRef.current || step !== 1 || !hasSourceContent) {
      return;
    }

    if (!canConfirm) {
      advanceAfterUploadRef.current = false;
      return;
    }

    advanceAfterUploadRef.current = false;
    setValidationError(null);
    setStep(2);
  }, [canConfirm, hasSourceContent, setValidationError, step]);

  const handleContinue = (): void => {
    if (!canConfirm) {
      const fallbackError =
        format === "csv"
          ? "Please provide a valid translations CSV."
          : "Please fix validation errors before continuing.";
      setValidationError(sourceError ?? fallbackError);
      return;
    }

    setValidationError(null);
    setStep(2);
  };

  const handleReviewLocales = (): void => {
    if (!canConfirm) {
      return;
    }

    const discovery = resolvePendingDiscovery({
      format,
      validation,
      csvDiscovery,
      availableLocales,
      defaultLocale,
    });
    if (!discovery) {
      return;
    }

    setPendingDiscovery(discovery);
    setStep(3);
  };

  const handleConfirmReplace = (selection: LocaleImportSelection): void => {
    if (!canConfirm) {
      return;
    }

    startTransition(async () => {
      const importResult = await runReplaceImport({
        format,
        dataListId,
        csvInput,
        validation,
        selection,
        defaultLocale,
      });

      if (importResult === null) {
        toast.error("JSON validation is missing. Please re-upload the file.");
        return;
      }

      reportReplaceImportResult(
        importResult,
        onReplaced,
        onOpenChange,
        format === "csv" ? "Failed to import CSV" : "Failed to replace items",
      );
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Replace Items</DialogTitle>
          <DialogDescription>
            {resolveReplaceStepDescription(step, title)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          <ReplaceItemsDialogBody
            step={step}
            format={format}
            validation={validation}
            csvDiscovery={csvDiscovery}
            pendingDiscovery={pendingDiscovery}
            displayError={displayError}
            displayWarning={displayWarning}
            selectedFileName={selectedFileName}
            availableLocalesCount={availableLocales.length}
            isPending={isPending}
            setFormat={setFormat}
            onFileSelected={handleFileSelectedWithAdvance}
            setStep={setStep}
            onConfirmReplace={handleConfirmReplace}
          />
        </div>

        <ReplaceItemsDialogFooter
          step={step}
          hasSourceContent={hasSourceContent}
          canConfirm={canConfirm}
          onOpenChange={onOpenChange}
          onContinue={handleContinue}
          onReviewLocales={handleReviewLocales}
          setStep={setStep}
        />
      </DialogContent>
    </Dialog>
  );
}
