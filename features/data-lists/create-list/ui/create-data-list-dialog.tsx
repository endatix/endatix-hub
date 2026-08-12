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
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import type { DataListDetails } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createDataListWithImportAction } from "../create-data-list-with-import.action";
import { DataListItemsInput } from "../../add-items/data-list-items-input";
import { DataListValidationPreview } from "../../add-items/data-list-validation-preview";
import { DataListCsvPreview } from "../../add-items/data-list-csv-preview";
import { useDataListSource } from "../../add-items/use-data-list-source.hook";
import {
  discoverLocalesFromJsonItems,
  filterJsonItemsByLocales,
} from "../../utils";
import { LocaleImportConfirmPanel } from "../../translations/locale-import-confirm-dialog";
import { filterTranslationsCsv } from "../../translations/parse-translations-csv";
import type {
  LocaleImportDiscovery,
  LocaleImportSelection,
} from "../../translations/locale-discovery";

interface CreateDataListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (details: DataListDetails) => void;
}

type CreateStep = 1 | 2 | 3;

/**
 * Create a new data list from CSV or JSON upload.
 * Step 1: details + source · Step 2: preview · Step 3: locale confirm.
 */
export function CreateDataListDialog({
  open,
  onOpenChange,
  onCreated,
}: Readonly<CreateDataListDialogProps>) {
  const [step, setStep] = useState<CreateStep>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
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
    validationError: fileValidationError,
    selectedFileName,
    setValidationError,
    handleFileSelected,
    reset: resetFileHandler,
  } = useDataListSource();

  const displayError = fileValidationError ?? sourceError;
  useEffect(() => {
    if (!open) {
      setStep(1);
      setName("");
      setDescription("");
      setPendingDiscovery(null);
      advanceAfterUploadRef.current = false;
      resetFileHandler();
    }
  }, [open, resetFileHandler]);

  const canProceedToReview = useMemo(() => {
    return name.trim().length > 0 && hasSourceContent && canConfirm;
  }, [canConfirm, hasSourceContent, name]);

  const handleFileSelectedWithAdvance = async (
    file: File | null,
  ): Promise<void> => {
    advanceAfterUploadRef.current = true;
    await handleFileSelected(file);
  };

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

    if (name.trim().length === 0) {
      advanceAfterUploadRef.current = false;
      return;
    }

    advanceAfterUploadRef.current = false;
    setValidationError(null);
    setStep(2);
  }, [canConfirm, hasSourceContent, name, setValidationError, step]);

  const handleContinue = () => {
    if (!canProceedToReview) {
      let fallbackError = "Please provide valid JSON items.";
      if (format === "csv") {
        fallbackError = "Please provide a valid translations CSV.";
      }
      setValidationError(sourceError ?? fallbackError);
      return;
    }

    setValidationError(null);
    setStep(2);
  };

  const handleReviewLocales = () => {
    if (!canConfirm) {
      return;
    }

    if (format === "json" && validation) {
      setPendingDiscovery(
        discoverLocalesFromJsonItems(validation.validItems, {
          availableLocales: [],
        }),
      );
      setStep(3);
      return;
    }

    if (format === "csv" && csvDiscovery) {
      setPendingDiscovery(csvDiscovery);
      setStep(3);
    }
  };

  const handleConfirmCreate = (selection: LocaleImportSelection): void => {
    if (!canConfirm) {
      return;
    }

    if (format === "json" && !validation) {
      toast.error("JSON validation is missing. Please re-upload the file.");
      return;
    }

    startTransition(async () => {
      const importResult =
        format === "csv"
          ? await createDataListWithImportAction({
              name: name.trim(),
              description: description.trim(),
              format: "csv",
              csv: filterTranslationsCsv(csvInput, selection.includedLocales),
              ensureLocales: selection.ensureLocales,
            })
          : await createDataListWithImportAction({
              name: name.trim(),
              description: description.trim(),
              format: "json",
              items: filterJsonItemsByLocales(
                validation!.validItems,
                selection.includedLocales,
              ),
              ensureLocales: selection.ensureLocales,
            });

      if (Result.isError(importResult)) {
        toast.error(importResult.message || "Failed to create data list");
        return;
      }

      onCreated?.(importResult.value);
      toast.success("Data list created successfully");
      onOpenChange(false);
    });
  };

  let stepDescription =
    "Define your new curated dataset and upload CSV or JSON.";
  if (step === 2) {
    stepDescription = "Review validation before creating the list.";
  } else if (step === 3) {
    stepDescription = "Choose which locales to import.";
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Create Data List</DialogTitle>
          <DialogDescription>{stepDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          {step === 1 ? (
            <>
              <div className="space-y-4">
                <Input
                  placeholder="Friendly Name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <Input
                  placeholder="Description (optional)"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>

              <DataListItemsInput
                format={format}
                onFormatChange={setFormat}
                onFileSelected={handleFileSelectedWithAdvance}
                selectedFileName={selectedFileName}
                fileInputId="create-data-list-file-upload"
              />

              {displayError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {displayError}
                </div>
              ) : null}
            </>
          ) : null}

          {step === 2 && format === "json" && validation ? (
            <DataListValidationPreview
              validation={validation}
              name={name}
              description={description}
            />
          ) : null}

          {step === 2 && format === "csv" && csvDiscovery ? (
            <DataListCsvPreview
              discovery={csvDiscovery}
              name={name}
              description={description}
            />
          ) : null}

          {step === 3 ? (
            <LocaleImportConfirmPanel
              title="Confirm locales for new list"
              mode="create"
              discovery={pendingDiscovery}
              catalogLocaleCount={0}
              isPending={isPending}
              onCancel={() => setStep(2)}
              onConfirm={handleConfirmCreate}
            />
          ) : null}
        </div>

        {step !== 3 ? (
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
              <Button
                onClick={handleContinue}
                disabled={name.trim().length === 0 || !hasSourceContent}
              >
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
                    Creating...
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
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
