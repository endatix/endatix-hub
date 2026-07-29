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
    <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 p-3">
      <Checkbox
        id="export-full-recompile"
        checked={fullRecompile}
        onCheckedChange={(checked) => onFullRecompileChange(checked === true)}
        disabled={disabled}
      />
      <div className="space-y-1">
        <Label htmlFor="export-full-recompile" className="font-normal">
          Full recompile (replace schema + regenerate flattened data)
        </Label>
        <p className="text-xs text-muted-foreground">
          Rebuilds the reporting schema from scratch and regenerates all
          flattened submissions. Use after export or schema bug fixes.
        </p>
      </div>
    </div>
  );
}
