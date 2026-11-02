"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAX_RUNS } from "../shared/test-link-limits";

const RUN_ITEMS = Array.from({ length: MAX_RUNS }, (_, i) => (
  <SelectItem key={i + 1} value={String(i + 1)}>
    {i + 1}
  </SelectItem>
));

type RunsProps = {
  id: string;
  value: number;
  onChange: (runs: number) => void;
};

/** Runs per test participant, 1 to 10: each run is its own test submission. */
export function TestLinkRunsSelect({
  id,
  value,
  onChange,
}: Readonly<RunsProps>) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between">
      <Label htmlFor={id} className="text-sm font-medium">
        Runs per participant
      </Label>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger id={id} className="h-9 w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{RUN_ITEMS}</SelectContent>
      </Select>
    </div>
  );
}
