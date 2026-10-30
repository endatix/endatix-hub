"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EXPIRY_OPTIONS } from "@/lib/share-links/share-link-expiry";

const EXPIRY_ITEMS = EXPIRY_OPTIONS.map((option) => (
  <SelectItem key={option.value} value={String(option.value)}>
    {option.label}
  </SelectItem>
));

type ExpiryProps = {
  id: string;
  value: number;
  onChange: (minutes: number) => void;
};

/** Link lifetime for test links: the Share Submission presets, 1 hour to 60 days. */
export function ExpirySelect({ id, value, onChange }: Readonly<ExpiryProps>) {
  return (
    <div className="flex flex-col gap-2 rounded-lg bg-surface-container-low p-3 sm:flex-row sm:items-center sm:justify-between">
      <Label htmlFor={id} className="text-sm font-medium">
        Link lifetime
      </Label>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger id={id} className="h-9 w-full sm:w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{EXPIRY_ITEMS}</SelectContent>
      </Select>
    </div>
  );
}
