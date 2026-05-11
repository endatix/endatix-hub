"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MAX_PREVIEW_ERRORS } from "../utils";
import type { ParsedValidation, JsonErrorAnnotation } from "../types";

interface DataListValidationPreviewProps {
  validation: ParsedValidation;
  name?: string;
  description?: string;
  onErrorClick?: (row: number, column: number) => void;
}

/**
 * A component that displays the validation preview of a data list.
 * @param validation - The validation to display.
 * @param name - The name of the data list.
 * @param description - The description of the data list.
 */
export function DataListValidationPreview({
  validation,
  name,
  description,
  onErrorClick,
}: Readonly<DataListValidationPreviewProps>) {
  const totalItems = validation.validItems.length + validation.errors.length;

  const handleErrorClick = (annotation: JsonErrorAnnotation) => {
    onErrorClick?.(annotation.row, annotation.column);
  };

  return (
    <Card className="gap-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Validation Preview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-muted p-2">
            <div className="text-xs text-muted-foreground">Total items</div>
            <div className="font-semibold">{totalItems}</div>
          </div>
          <div className="rounded-md bg-muted p-2">
            <div className="text-xs text-muted-foreground">Valid items</div>
            <div className="font-semibold text-primary">
              {validation.validItems.length}
            </div>
          </div>
          <div className="rounded-md bg-muted p-2">
            <div className="text-xs text-muted-foreground">
              Items with errors
            </div>
            <div className="font-semibold text-destructive">
              {validation.errors.length}
            </div>
          </div>
        </div>

        {(name || description) && (
          <div className="rounded-md border p-3 text-xs">
            <div className="font-medium">{name}</div>
            {description && (
              <div className="mt-1 text-muted-foreground">{description}</div>
            )}
          </div>
        )}

        {validation.errors.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-destructive">
              Following items will be skipped. Click on the errors to fix them.
            </p>
            <ul className="list-disc space-y-0 pl-4 text-xs text-destructive">
              {validation.annotations
                .slice(0, MAX_PREVIEW_ERRORS)
                .map((annotation, index) => (
                  <li key={`${annotation.row}-${annotation.column}-${index}`}>
                    <button
                      type="button"
                      className="cursor-pointer text-left hover:underline"
                      onClick={() => handleErrorClick(annotation)}
                    >
                      {annotation.text}
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
