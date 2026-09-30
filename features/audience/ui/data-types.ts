import type { AudienceDataType } from "@/lib/endatix-api/audience/types";

export const AUDIENCE_DATA_TYPES: ReadonlyArray<{
  value: AudienceDataType;
  label: string;
}> = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "date", label: "Date" },
  { value: "date_time", label: "Date & time" },
  { value: "single_choice", label: "Single choice" },
  { value: "multiple_choice", label: "Multiple choice" },
];

export function dataTypeLabel(dataType: string): string {
  return (
    AUDIENCE_DATA_TYPES.find((entry) => entry.value === dataType)?.label ??
    dataType
  );
}
