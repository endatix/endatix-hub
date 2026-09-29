"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ExportDialogPrepareOptionsProps {
  fullRecompile: boolean;
  onFullRecompileChange: (fullRecompile: boolean) => void;
  disabled?: boolean;
}

export function ExportDialogPrepareOptions({
  fullRecompile,
  onFullRecompileChange,
  disabled = false,
}: Readonly<ExportDialogPrepareOptionsProps>) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-surface-container-low p-4">
      <Checkbox
        id="export-full-recompile"
        checked={fullRecompile}
        onCheckedChange={(checked) => onFullRecompileChange(checked === true)}
        disabled={disabled}
      />
      <div className="space-y-1">
        <Label htmlFor="export-full-recompile" className="font-normal">
          Full recompile
        </Label>
        <p className="text-xs text-muted-foreground">
          Replaces the schema and reprocesses every submission. Use when answers
          or columns are wrong in an export.
        </p>
      </div>
    </div>
  );
}
