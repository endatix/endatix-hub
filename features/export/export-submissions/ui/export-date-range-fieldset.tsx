"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface ExportDateRangeFieldsetProps {
  legend: string;
  legendTooltip?: string;
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
  legendTooltip,
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

  return (
    <fieldset className="grid gap-3">
      <legend className="flex items-center gap-1.5 text-sm font-medium">
        <span>{legend}</span>
        {legendTooltip ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={`${legend} info`}
                >
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{legendTooltip}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : null}
      </legend>
      <div className="grid grid-cols-2 gap-3">
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
            aria-describedby={hasError ? errorId : undefined}
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
            aria-describedby={hasError ? errorId : undefined}
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
