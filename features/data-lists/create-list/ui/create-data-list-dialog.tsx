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
import { useEffect, useMemo, useState, useTransition } from "react";
import { createDataListAction } from "../create-data-list.action";
import {
  DataListItemsInput,
  TabValue,
} from "../../add-items/data-list-items-input";
import { DataListValidationPreview } from "../../add-items/data-list-validation-preview";
import { useJsonFileSource } from "../../add-items/use-json-file-source.hook";
import { replaceDataListItemsAction } from "../../replace-items/replace-data-list-items.action";

interface CreateDataListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (details: DataListDetails) => void;
}

type CreateStep = 1 | 2;

/**
 * A dialog for creating a new data list.
 * @param open - Whether the dialog is open.
 * @param onOpenChange - A callback function to call when the dialog is opened or closed.
 * @param onCreated - A callback function to call when the data list is created.
 * @returns The CreateDataListDialog component.
 */
export function CreateDataListDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateDataListDialogProps) {
  const [step, setStep] = useState<CreateStep>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tabValue, setTabValue] = useState<TabValue>("upload");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    jsonInput,
    validation,
    selectedFileName,
    activeError,
    setJsonInput,
    handleFileSelected,
    handleErrorClick: hookHandleErrorClick,
    reset: resetFileHandler,
  } = useJsonFileSource();

  useEffect(() => {
    if (!open) {
      setStep(1);
      setName("");
      setDescription("");
      setTabValue("upload");
      setValidationError(null);
      resetFileHandler();
    }
  }, [open, resetFileHandler]);

  const canProceedToReview = useMemo(() => {
    return (
      name.trim().length > 0 &&
      validation !== null &&
      validation.validItems.length > 0
    );
  }, [name, validation]);

  const canCreate = useMemo(() => {
    return (
      canProceedToReview &&
      validation !== null &&
      validation.errors.length === 0
    );
  }, [canProceedToReview, validation]);

  const handleErrorClick = (row: number, column: number) => {
    setStep(1);
    setTabValue("paste");
    hookHandleErrorClick(row, column);
  };

  const handleContinue = () => {
    if (!validation || validation.validItems.length === 0) {
      setValidationError(
        validation?.errors[0] || "Please provide valid JSON items.",
      );
      return;
    }

    setValidationError(null);
    setStep(2);
  };

  const handleCreate = () => {
    if (!canCreate || validation === null) {
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
      const replaceResult = await replaceDataListItemsAction(
        String(createdList.id),
        validation.validItems,
      );

      if (Result.isError(replaceResult)) {
        toast.error(
          replaceResult.message || "List created but failed to import items",
        );
        return;
      }

      onCreated?.(replaceResult.value);
      toast.success("Data list created successfully");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Create Data List</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Define your new curated dataset and upload the JSON source."
              : "Review validation before creating the list."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          {step === 1 && (
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
                tabValue={tabValue}
                onTabChange={setTabValue}
                jsonInput={jsonInput}
                onJsonInputChange={setJsonInput}
                onFileSelected={handleFileSelected}
                selectedFileName={selectedFileName}
                fileInputId="create-data-list-file-upload"
                errors={validation?.annotations}
                activeError={activeError}
                onErrorClick={handleErrorClick}
              />

              {validation && step === 1 && (
                <DataListValidationPreview
                  validation={validation}
                  onErrorClick={handleErrorClick}
                />
              )}
            </>
          )}

          {step === 2 && validation && (
            <DataListValidationPreview
              validation={validation}
              name={name}
              description={description}
              onErrorClick={handleErrorClick}
            />
          )}

          {validationError && step === 1 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {validationError}
            </div>
          )}
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
              disabled={
                name.trim().length === 0 || jsonInput.trim().length === 0
              }
            >
              Continue
            </Button>
          ) : (
            <Button onClick={handleCreate} disabled={!canCreate || isPending}>
              {isPending ? (
                <>
                  <Spinner className="mr-1 h-4 w-4" />
                  Creating...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Confirm Import
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
