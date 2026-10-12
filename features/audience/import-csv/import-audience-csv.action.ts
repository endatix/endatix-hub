"use server";

import { Permissions } from "@/features/auth/authorization";
import type { AudienceImportResult } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";
import { readCsvPreview } from "./csv-preview";

export type ImportAudienceCsvInput = {
  formId: string;
  csvText: string;
  identifierColumn: string;
  fileName: string;
  propertyColumns: Record<string, string>;
};

const IMPORT_LOG = {
  permission: Permissions.Forms.Edit,
  fallbackMessage: "Failed to import audience.",
  logMessage: "Failed to import audience.",
  loggerName: "audience.import",
} as const;

function rejectUnusable(
  input: ImportAudienceCsvInput,
): Result<AudienceImportResult> | null {
  if (!input.identifierColumn.trim()) {
    return Result.validationError("Choose the identifier column.");
  }
  const preview = readCsvPreview(input.csvText);
  return Result.isError(preview) ? preview : null;
}

export async function importAudienceCsvAction(
  input: ImportAudienceCsvInput,
): Promise<Result<AudienceImportResult>> {
  const rejected = rejectUnusable(input);
  if (rejected) return rejected;

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
