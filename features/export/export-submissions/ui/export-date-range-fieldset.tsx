"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ExportDateRangeFieldsetProps {
  legend: string;
  /** One muted line saying which moment this date is; every range gets one. */
  hint: string;
  fromId: string;
  toId: string;
  errorId: string;
  fromValue: string;
  toValue: string;
  error: string | null;
  disabled: boolean;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
}

export function ExportDateRangeFieldset({
  legend,
  hint,
  fromId,
  toId,
  errorId,
  fromValue,
  toValue,
  error,
  disabled,
  onFromChange,
  onToChange,
}: Readonly<ExportDateRangeFieldsetProps>) {
  const hasError = error != null;
  const hintId = `${fromId}-hint`;
  const describedBy = hasError ? `${hintId} ${errorId}` : hintId;

  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <p id={hintId} className="text-xs text-muted-foreground">
        {hint}
      </p>
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div className="grid gap-1.5">
          <Label htmlFor={fromId} className="text-xs text-muted-foreground">
            From
          </Label>
          <Input
            id={fromId}
            type="date"
            value={fromValue}
            onChange={(event) => onFromChange(event.target.value)}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={describedBy}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={toId} className="text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id={toId}
            type="date"
            value={toValue}
            onChange={(event) => onToChange(event.target.value)}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={describedBy}
          />
        </div>
      </div>
      {hasError ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
