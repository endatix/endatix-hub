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
import { useEffect, useMemo, useState, useTransition } from "react";
import { replaceDataListItemsAction } from "../replace-data-list-items.action";
import { DataListItemsInput } from "../../add-items/data-list-items-input";
import { DataListValidationPreview } from "../../add-items/data-list-validation-preview";
import { useJsonFileSource } from "../../add-items/use-json-file-source.hook";
import {
  parseAndValidateJson,
  type ParsedValidation,
} from "../../add-items/types";

interface ReplaceItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dataListId: string;
  title: string;
  onReplaced?: (details: DataListDetails) => void;
}

export function ReplaceItemsDialog({
  open,
  onOpenChange,
  dataListId,
  title,
  onReplaced,
}: ReplaceItemsDialogProps) {
  const [tabValue, setTabValue] = useState("upload");
  const [isPending, startTransition] = useTransition();

  const {
    jsonInput,
    validationError,
    selectedFileName,
    setJsonInput,
    handleFileSelected,
    reset: resetFileHandler,
  } = useJsonFileSource();

  const validation = useMemo<ParsedValidation | null>(() => {
    if (!jsonInput.trim()) {
      return null;
    }

    return parseAndValidateJson(jsonInput);
  }, [jsonInput]);

  useEffect(() => {
    if (!open) {
      resetFileHandler();
      setTabValue("upload");
    }
  }, [open, resetFileHandler]);

  const canSubmit = useMemo(() => {
    return (
      validation !== null &&
      validation.validItems.length > 0 &&
      validation.errors.length === 0
    );
  }, [validation]);

  const handleReplace = () => {
    if (validation === null) {
      setValidationError("Please provide JSON input.");
      return;
    }

    if (!canSubmit) {
      setValidationError(
        "Please fix validation errors before replacing items.",
      );
      return;
    }

    startTransition(async () => {
      const replaceResult = await replaceDataListItemsAction(
        dataListId,
        validation.validItems,
      );

      if (Result.isError(replaceResult)) {
        toast.error(replaceResult.message || "Failed to replace items");
        return;
      }

      onReplaced?.(replaceResult.value);
      toast.success("Items replaced successfully");
      onOpenChange(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>Replace Items</DialogTitle>
          <DialogDescription>
            Upload or paste JSON to replace all items in{" "}
            <span className="font-medium">{title}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          <DataListItemsInput
            tabValue={tabValue}
            onTabChange={setTabValue}
            jsonInput={jsonInput}
            onJsonInputChange={setJsonInput}
            onFileSelected={handleFileSelected}
            selectedFileName={selectedFileName}
            fileInputId="replace-data-list-file-upload"
          />

          {validationError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {validationError}
            </div>
          )}

          {validation && <DataListValidationPreview validation={validation} />}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleReplace} disabled={!canSubmit || isPending}>
            {isPending ? (
              <>
                <Spinner className="mr-1 h-4 w-4" />
                Replacing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Replace Items
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
