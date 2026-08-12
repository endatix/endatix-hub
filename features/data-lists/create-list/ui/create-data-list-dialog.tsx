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
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import type { DataListDetails } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { Upload } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import {
  createDataListWithImportAction,
  type CreateDataListWithImportInput,
} from "../create-data-list-with-import.action";
import {
  DataListItemsInput,
  type DataListSourceFormat,
} from "../../add-items/data-list-items-input";
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
import type { ParsedValidation } from "../../types";

interface CreateDataListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (details: DataListDetails) => void;
}

type CreateStep = 1 | 2 | 3;

const CREATE_STEP_DESCRIPTION: Record<CreateStep, string> = {
  1: "Define your new curated dataset and upload CSV or JSON.",
  2: "Review validation before creating the list.",
  3: "Choose which locales to import.",
};

function reportCreateImportResult(
  importResult: Result<DataListDetails>,
  onCreated: ((details: DataListDetails) => void) | undefined,
  onOpenChange: (open: boolean) => void,
): void {
  if (Result.isError(importResult)) {
    toast.error(importResult.message || "Failed to create data list");
    return;
  }

  onCreated?.(importResult.value);
  toast.success("Data list created successfully");
  onOpenChange(false);
}

function buildCreateImportInput(args: {
  format: DataListSourceFormat;
  name: string;
  description: string;
  csvInput: string;
  validation: ParsedValidation | null;
  selection: LocaleImportSelection;
}): CreateDataListWithImportInput | null {
  const { format, name, description, csvInput, validation, selection } = args;
  const trimmedName = name.trim();
  const trimmedDescription = description.trim();

  if (format === "csv") {
    return {
      name: trimmedName,
      description: trimmedDescription,
      format: "csv",
      csv: filterTranslationsCsv(csvInput, selection.includedLocales),
      ensureLocales: selection.ensureLocales,
    };
  }

  if (!validation) {
    return null;
  }

  return {
    name: trimmedName,
    description: trimmedDescription,
    format: "json",
    items: filterJsonItemsByLocales(
      validation.validItems,
      selection.includedLocales,
    ),
    ensureLocales: selection.ensureLocales,
  };
}

function resolvePendingDiscovery(args: {
  format: DataListSourceFormat;
  validation: ParsedValidation | null;
  csvDiscovery: LocaleImportDiscovery | null;
}): LocaleImportDiscovery | null {
  const { format, validation, csvDiscovery } = args;

  if (format === "json" && validation) {
    return discoverLocalesFromJsonItems(validation.validItems, {
      availableLocales: [],
    });
  }

  if (format === "csv" && csvDiscovery) {
    return csvDiscovery;
  }

  return null;
}

function CreateDataListDialogBody(props: {
  step: CreateStep;
  name: string;
  description: string;
  format: DataListSourceFormat;
  validation: ParsedValidation | null;
  csvDiscovery: LocaleImportDiscovery | null;
  pendingDiscovery: LocaleImportDiscovery | null;
  displayError: string | null;
  selectedFileName: string | null;
  isPending: boolean;
  setName: (value: string) => void;
  setDescription: (value: string) => void;
  setFormat: (format: DataListSourceFormat) => void;
  onFileSelected: (file: File | null) => Promise<void>;
  setStep: (step: CreateStep) => void;
  onConfirmCreate: (selection: LocaleImportSelection) => void;
}): ReactNode {
  const {
    step,
    name,
    description,
    format,
    validation,
    csvDiscovery,
    pendingDiscovery,
    displayError,
    selectedFileName,
    isPending,
    setName,
    setDescription,
    setFormat,
    onFileSelected,
    setStep,
    onConfirmCreate,
  } = props;

  if (step === 1) {
    return (
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
          onFileSelected={onFileSelected}
          selectedFileName={selectedFileName}
          fileInputId="create-data-list-file-upload"
        />

        {displayError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {displayError}
          </div>
        ) : null}
      </>
    );
  }

  if (step === 2 && format === "json" && validation) {
    return (
      <DataListValidationPreview
        validation={validation}
        name={name}
        description={description}
      />
    );
  }

  if (step === 2 && format === "csv" && csvDiscovery) {
    return (
      <DataListCsvPreview
        discovery={csvDiscovery}
        name={name}
        description={description}
      />
    );
  }

  if (step === 3) {
    return (
      <LocaleImportConfirmPanel
        title="Confirm locales for new list"
        mode="create"
        discovery={pendingDiscovery}
        catalogLocaleCount={0}
        isPending={isPending}
        onCancel={() => setStep(2)}
        onConfirm={onConfirmCreate}
      />
    );
  }

  return null;
}

function CreateDataListDialogFooter(props: {
  step: CreateStep;
  name: string;
  hasSourceContent: boolean;
  canConfirm: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
  onReviewLocales: () => void;
  setStep: (step: CreateStep) => void;
}): ReactNode {
  const {
    step,
    name,
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
        <Button
          onClick={onContinue}
          disabled={name.trim().length === 0 || !hasSourceContent}
        >
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
    if (!advanceAfterUploadRef.current || step !== 1 || !hasSourceContent) {
      return;
    }

    if (!canConfirm || name.trim().length === 0) {
      advanceAfterUploadRef.current = false;
      return;
    }

    advanceAfterUploadRef.current = false;
    setValidationError(null);
    setStep(2);
  }, [canConfirm, hasSourceContent, name, setValidationError, step]);

  const handleContinue = () => {
    if (!canProceedToReview) {
      const fallbackError =
        format === "csv"
          ? "Please provide a valid translations CSV."
          : "Please provide valid JSON items.";
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

    const discovery = resolvePendingDiscovery({
      format,
      validation,
      csvDiscovery,
    });
    if (!discovery) {
      return;
    }

    setPendingDiscovery(discovery);
    setStep(3);
  };

  const handleConfirmCreate = (selection: LocaleImportSelection): void => {
    if (!canConfirm) {
      return;
    }

    const input = buildCreateImportInput({
      format,
      name,
      description,
      csvInput,
      validation,
      selection,
    });
    if (!input) {
      toast.error("JSON validation is missing. Please re-upload the file.");
      return;
    }

    startTransition(async () => {
      const importResult = await createDataListWithImportAction(input);
      reportCreateImportResult(importResult, onCreated, onOpenChange);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Create Data List</DialogTitle>
          <DialogDescription>
            {CREATE_STEP_DESCRIPTION[step]}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          <CreateDataListDialogBody
            step={step}
            name={name}
            description={description}
            format={format}
            validation={validation}
            csvDiscovery={csvDiscovery}
            pendingDiscovery={pendingDiscovery}
            displayError={displayError}
            selectedFileName={selectedFileName}
            isPending={isPending}
            setName={setName}
            setDescription={setDescription}
            setFormat={setFormat}
            onFileSelected={handleFileSelectedWithAdvance}
            setStep={setStep}
            onConfirmCreate={handleConfirmCreate}
          />
        </div>

        <CreateDataListDialogFooter
          step={step}
          name={name}
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
