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
import { DataListItemsInput } from "../../ui/data-list-items-input";
import { DataListValidationPreview } from "../../ui/data-list-validation-preview";
import { useJsonFileHandler } from "../../ui/use-json-file-handler";
import {
  parseAndValidateJson,
  type ParsedValidation,
} from "../../ui/types";
import { replaceDataListItemsAction } from "../../replace-list-items/replace-data-list-items.action";

interface CreateDataListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (details: DataListDetails) => void;
}

type CreateStep = 1 | 2;

export function CreateDataListDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateDataListDialogProps) {
  const [step, setStep] = useState<CreateStep>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tabValue, setTabValue] = useState("upload");
  const [validation, setValidation] = useState<ParsedValidation | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { jsonInput, selectedFileName, handleFileSelected, reset: resetFileHandler } =
    useJsonFileHandler();

  useEffect(() => {
    if (!open) {
      setStep(1);
      setName("");
      setDescription("");
      setTabValue("upload");
      setValidation(null);
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

  const handleContinue = () => {
    const parsed = parseAndValidateJson(jsonInput);
    setValidation(parsed);

    if (parsed.validItems.length === 0) {
      setValidationError(
        parsed.errors[0] || "Please provide valid JSON items.",
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
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              />
            </>
          )}

          {step === 2 && validation && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Validation Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-md bg-muted p-2">
                    <div className="text-xs text-muted-foreground">
                      Total rows
                    </div>
                    <div className="font-semibold">
                      {validation.validItems.length + validation.errors.length}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted p-2">
                    <div className="text-xs text-muted-foreground">
                      Valid rows
                    </div>
                    <div className="font-semibold text-primary">
                      {validation.validItems.length}
                    </div>
                  </div>
                  <div className="rounded-md bg-muted p-2">
                    <div className="text-xs text-muted-foreground">
                      Rows with errors
                    </div>
                    <div className="font-semibold text-destructive">
                      {validation.errors.length}
                    </div>
                  </div>
                </div>

                <div className="rounded-md border p-3 text-xs">
                  <div className="font-medium">{name}</div>
                  {description && (
                    <div className="mt-1 text-muted-foreground">
                      {description}
                    </div>
                  )}
                </div>

                {validation.errors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-destructive">
                      Fix these issues before creating:
                    </p>
                    <ul className="list-disc space-y-1 pl-4 text-xs text-destructive">
                      {validation.errors
                        .slice(0, MAX_PREVIEW_ERRORS)
                        .map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
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
