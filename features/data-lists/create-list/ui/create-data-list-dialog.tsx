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
import { createDataListAction } from "../create-data-list.action";
import { DataListItemsInput } from "../../add-items/data-list-items-input";
import { DataListValidationPreview } from "../../add-items/data-list-validation-preview";
import { DataListCsvPreview } from "../../add-items/data-list-csv-preview";
import { useDataListSource } from "../../add-items/use-data-list-source.hook";
import { replaceDataListItemsAction } from "../../replace-items/replace-data-list-items.action";
import {
  discoverLocalesFromJsonItems,
  filterJsonItemsByLocales,
} from "../../utils";
import { LocaleImportConfirmDialog } from "../../translations/locale-import-confirm-dialog";
import { uploadTranslationsCsvAction } from "../../translations/translations-csv.action";
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

type CreateStep = 1 | 2;

/**
 * Create a new data list from CSV or JSON upload.
 * Step 1: details + source · Step 2: preview · then locale confirm.
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
  } = useDataListSource();

  useEffect(() => {
    if (!open) {
      setStep(1);
      setName("");
      setDescription("");
      setIsConfirmOpen(false);
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
      setValidationError(
        format === "csv"
          ? "Please provide a valid translations CSV."
          : "Please provide valid JSON items.",
      );
      return;
    }

    setValidationError(null);
    setStep(2);
  };

  const handleCreate = () => {
    if (!canConfirm) {
      return;
    }

    if (format === "json" && validation) {
      setPendingDiscovery(
        discoverLocalesFromJsonItems(validation.validItems, {
          availableLocales: [],
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

  const handleConfirmCreate = (selection: LocaleImportSelection): void => {
    if (!canConfirm) {
      return;
    }

    startTransition(async () => {
      const createResult = await createDataListAction({
        name: name.trim(),
        description: description.trim(),
      });

      if (Result.isError(createResult)) {
        toast.error(createResult.message || "Failed to create data list");
        return;
      }

      const createdList = createResult.value;
      const dataListId = String(createdList.id);

      if (format === "csv") {
        const csv = filterTranslationsCsv(csvInput, selection.includedLocales);
        const uploadResult = await uploadTranslationsCsvAction({
          dataListId,
          csv,
          ensureLocales: selection.ensureLocales,
        });

        if (Result.isError(uploadResult)) {
          toast.error(
            uploadResult.message ||
              "List created but failed to import CSV items",
          );
          return;
        }

        onCreated?.(uploadResult.value);
      } else {
        if (!validation) {
          return;
        }

        const items = filterJsonItemsByLocales(
          validation.validItems,
          selection.includedLocales,
        );
        const replaceResult = await replaceDataListItemsAction(
          dataListId,
          items,
          selection.ensureLocales,
        );

        if (Result.isError(replaceResult)) {
          toast.error(
            replaceResult.message || "List created but failed to import items",
          );
          return;
        }

        onCreated?.(replaceResult.value);
      }

      toast.success("Data list created successfully");
      setIsConfirmOpen(false);
      onOpenChange(false);
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} modal={!isConfirmOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle>Create Data List</DialogTitle>
            <DialogDescription>
              {step === 1
                ? "Define your new curated dataset and upload CSV or JSON."
                : "Review validation before creating the list."}
            </DialogDescription>
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

                {fileValidationError ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {fileValidationError}
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
              <Button
                onClick={handleContinue}
                disabled={name.trim().length === 0 || !hasSourceContent}
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
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
        </DialogContent>
      </Dialog>

      <LocaleImportConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Confirm locales for new list"
        mode="create"
        discovery={pendingDiscovery}
        catalogLocaleCount={0}
        isPending={isPending}
        onConfirm={handleConfirmCreate}
      />
    </>
  );
}
