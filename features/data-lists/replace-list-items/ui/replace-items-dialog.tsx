"use client";

import { Spinner } from "@/components/loaders/spinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  MAX_FILE_SIZE_BYTES,
  parseAndValidateJson,
  type ParsedValidation,
} from "../json-import-validation";
import { replaceDataListItemsAction } from "../replace-data-list-items.action";
import { DataListItemsInput } from "../../ui/data-list-items-input";

const MAX_PREVIEW_ERRORS = 20;

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
  const [jsonInput, setJsonInput] = useState("");
  const [tabValue, setTabValue] = useState("upload");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const validation = useMemo<ParsedValidation | null>(() => {
    if (!jsonInput.trim()) {
      return null;
    }

    return parseAndValidateJson(jsonInput);
  }, [jsonInput]);

  useEffect(() => {
    if (!open) {
      setJsonInput("");
      setValidationError(null);
      setSelectedFileName(null);
      setTabValue("upload");
    }
  }, [open]);

  const canSubmit = useMemo(() => {
    return (
      validation !== null &&
      validation.validItems.length > 0 &&
      validation.errors.length === 0
    );
  }, [validation]);

  const handleFileSelected = (file: File | null) => {
    if (!file) {
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setJsonInput("");
      setValidationError("File is too large. Max file size is 5MB.");
      setSelectedFileName(file.name);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      setSelectedFileName(file.name);
      setJsonInput(content);
    };
    reader.onerror = () => {
      setValidationError("Failed to read the selected file.");
    };
    reader.readAsText(file);
  };

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

          {validation && (
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

                {validation.errors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-destructive">
                      Fix these issues before replacing:
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
