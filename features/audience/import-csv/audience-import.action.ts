"use server";

import { Permissions } from "@/features/auth/authorization";
import type {
  AudienceImportMove,
  AudienceImportView,
  IndexedImportChunk,
  StartAudienceImportRequest,
} from "@/lib/endatix-api/audience/types";
import type { Result } from "@/lib/result";
import { withHubAudienceApi } from "../shared/with-hub-audience-api.server";

const IMPORT_LOG = {
  permission: Permissions.Forms.Edit,
  logMessage: "Failed to import participants.",
  loggerName: "audience.import",
} as const;

type ImportRef = { formId: string; importId: string };

/** Starts a staged import after the Columns step. A 409 means the form already has one running. */
export async function startAudienceImportAction({
  formId,
  ...request
}: StartAudienceImportRequest & {
  formId: string;
}): Promise<Result<AudienceImportView>> {
  return withHubAudienceApi(
    (api) => api.audience.startImport(formId, request),
    {
      ...IMPORT_LOG,
      fallbackMessage: "The import could not start.",
    },
  );
}

export async function sendAudienceImportChunkAction({
  formId,
  importId,
  chunk,
}: ImportRef & { chunk: IndexedImportChunk }): Promise<
  Result<AudienceImportView>
> {
  return withHubAudienceApi(
    (api) => api.audience.sendImportChunk(formId, importId, chunk),
    { ...IMPORT_LOG, fallbackMessage: "Part of the file could not be sent." },
  );
}

/** One import, or with `importId: "current"` the form's unfinished one. A background read. */
export async function getAudienceImportAction({
  formId,
  importId,
}: ImportRef): Promise<Result<AudienceImportView>> {
  return withHubAudienceApi((api) => api.audience.getImport(formId, importId), {
    ...IMPORT_LOG,
    fallbackMessage: "The import could not be read.",
    background: true,
  });
}

/** Confirms or resumes (`writing`), or cancels; the People list behind it is revalidated. */
export async function moveAudienceImportAction({
  formId,
  importId,
  to,
}: ImportRef & { to: AudienceImportMove }): Promise<
  Result<AudienceImportView>
> {
  return withHubAudienceApi(
    (api) => api.audience.moveImport(formId, importId, to),
    {
      ...IMPORT_LOG,
      fallbackMessage: "The import could not be changed.",
      formId,
    },
  );
}
