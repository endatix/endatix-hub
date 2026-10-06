"use server";

import type { AudienceImportResult } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api";

export type ImportAudienceCsvInput = {
  formId: string;
  csvText: string;
  identifierColumn: string;
  fileName: string;
  propertyColumns: Record<string, string>;
};

const IMPORT_LOG = {
  fallbackMessage: "Failed to import audience.",
  logMessage: "Failed to import audience.",
  loggerName: "audience.import",
} as const;

export async function importAudienceCsvAction(
  input: ImportAudienceCsvInput,
): Promise<Result<AudienceImportResult>> {
  if (!input.identifierColumn.trim()) {
    return Result.validationError("Choose the identifier column.");
  }

  return withHubAudienceApi(
    (api) =>
      api.audience.importCsv(input.formId, {
        csvText: input.csvText,
        identifierColumn: input.identifierColumn,
        fileName: input.fileName,
        propertyColumns: input.propertyColumns,
      }),
    { ...IMPORT_LOG, formId: input.formId },
  );
}
