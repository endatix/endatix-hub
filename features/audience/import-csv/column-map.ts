import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import { AudienceDataType } from "@/lib/endatix-api/audience/types";

export const SKIP_COLUMN = "skip";

export function importableProperties(
  properties: readonly AudienceProperty[],
): AudienceProperty[] {
  return properties.filter(
    (property) =>
      property.dataType !== AudienceDataType.SingleChoice &&
      property.dataType !== AudienceDataType.MultipleChoice,
  );
}

export function propertyColumnMap(
  selections: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(selections).filter(([, column]) => column !== SKIP_COLUMN),
  );
}
