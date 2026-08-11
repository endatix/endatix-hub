"use client";

import { Spinner } from "@/components/loaders/spinner";
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
import { useEffect, useRef, useState, useTransition } from "react";
import { replaceDataListItemsAction } from "../replace-data-list-items.action";
import {
  DataListItemsInput,
  type DataListSourceFormat,
} from "../../add-items/data-list-items-input";
import { DataListValidationPreview } from "../../add-items/data-list-validation-preview";
import { DataListCsvPreview } from "../../add-items/data-list-csv-preview";
import { useDataListSource } from "../../add-items/use-data-list-source.hook";
import { LocaleImportConfirmDialog } from "../../translations/locale-import-confirm-dialog";
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

type ReplaceStep = 1 | 2;

/**
 * Replace all items via CSV or JSON upload.
 * Step 1: source · Step 2: preview · then locale confirm.
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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
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
      setIsConfirmOpen(false);
      setPendingDiscovery(null);
      advanceAfterUploadRef.current = false;
    }
  }, [open, resetFileHandler]);

  useEffect(() => {
    if (!advanceAfterUploadRef.current || step !== 1) {
      return;
    }

    if (!hasSourceContent) {
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
      setValidationError(
        format === "csv"
          ? "Please provide a valid translations CSV."
          : "Please fix validation errors before continuing.",
      );
      return;
    }

    setValidationError(null);
    setStep(2);
  };

  const handleReviewLocales = (): void => {
    if (!canConfirm) {
      return;
    }

    if (format === "json" && validation) {
      setPendingDiscovery(
        discoverLocalesFromJsonItems(validation.validItems, {
          availableLocales,
          defaultLocale,
        }),
      );
      setIsConfirmOpen(true);
      return;
    }

    if (format === "csv" && csvDiscovery) {
      setPendingDiscovery(csvDiscovery);
      setIsConfirmOpen(true);
    }
  };

  const handleConfirmReplace = (selection: LocaleImportSelection): void => {
    if (!canConfirm) {
      return;
    }

    startTransition(async () => {
      if (format === "csv") {
        const csv = filterTranslationsCsv(
          csvInput,
          selection.includedLocales,
          defaultLocale,
        );
        const uploadResult = await uploadTranslationsCsvAction({
          dataListId,
          csv,
          ensureLocales: selection.ensureLocales,
        });

        if (Result.isError(uploadResult)) {
          toast.error(uploadResult.message || "Failed to import CSV");
          return;
        }

        onReplaced?.(uploadResult.value);
      } else {
        if (!validation) {
          return;
        }

        const items = filterJsonItemsByLocales(
          validation.validItems,
          selection.includedLocales,
          defaultLocale,
        );
        const replaceResult = await replaceDataListItemsAction(
          dataListId,
          items,
          selection.ensureLocales,
        );

        if (Result.isError(replaceResult)) {
          toast.error(replaceResult.message || "Failed to replace items");
          return;
        }

        onReplaced?.(replaceResult.value);
      }

      toast.success("Items replaced successfully");
      setIsConfirmOpen(false);
      onOpenChange(false);
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} modal={!isConfirmOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Replace Items</DialogTitle>
            <DialogDescription>
              {step === 1 ? (
                <>
                  Upload CSV or JSON to replace all items in{" "}
                  <span className="font-medium">{title}</span>.
                </>
              ) : (
                "Review the import preview before choosing locales."
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
            {step === 1 ? (
              <>
                <DataListItemsInput
                  format={format}
                  onFormatChange={setFormat}
                  onFileSelected={handleFileSelectedWithAdvance}
                  selectedFileName={selectedFileName}
                  fileInputId="replace-data-list-file-upload"
                />

                {fileValidationError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {fileValidationError}
                  </div>
                ) : null}
              </>
            ) : null}

            {step === 2 && format === "json" && validation ? (
              <DataListValidationPreview validation={validation} />
            ) : null}

            {step === 2 && format === "csv" && csvDiscovery ? (
              <DataListCsvPreview discovery={csvDiscovery} />
            ) : null}
          </div>

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
              <Button onClick={handleContinue} disabled={!hasSourceContent}>
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleReviewLocales}
                disabled={!canConfirm || isPending}
              >
                {isPending ? (
                  <>
                    <Spinner className="mr-1 h-4 w-4" />
                    Replacing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Review locales
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LocaleImportConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={format === "csv" ? "Confirm CSV import" : "Confirm JSON import"}
        mode="replace"
        discovery={pendingDiscovery}
        catalogLocaleCount={availableLocales.length}
        isPending={isPending}
        onConfirm={handleConfirmReplace}
      />
    </>
  );
}
