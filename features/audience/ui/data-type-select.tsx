"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AudienceDataType } from "@/lib/endatix-api/audience/types";
import { CREATABLE_DATA_TYPES } from "./data-types";

type DataTypeSelectProps = {
  value: AudienceDataType;
  disabled: boolean;
  onChange: (value: AudienceDataType) => void;
};

export function DataTypeSelect({
  value,
  disabled,
  onChange,
}: Readonly<DataTypeSelectProps>) {
  return (
    <div className="space-y-1">
      <Label>Type</Label>
      <Select value={value} disabled={disabled} onValueChange={(v) => onChange(v as AudienceDataType)}>
        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
        <SelectContent>
          {CREATABLE_DATA_TYPES.map((entry) => (
            <SelectItem key={entry.value} value={entry.value}>{entry.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
