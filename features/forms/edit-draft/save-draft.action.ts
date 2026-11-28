"use server";

import type { EndatixApi } from "@/lib/endatix-api";
import {
  isAuthError,
  isNetworkError,
  isPreconditionFailed,
  type ApiError,
} from "@/lib/endatix-api/shared/api-result";
import { toResult } from "@/lib/result";
import type {
  DraftWrite,
  WriteResult,
} from "@/lib/survey-features/draft-autosave/controller";
import { draftWriter } from "./draft-writer.server";

type DraftClient = EndatixApi["forms"]["drafts"];
function failure(error: ApiError): WriteResult {
  if (isPreconditionFailed(error) && error.error.details?.draft)
    return { kind: "stale", head: error.error.details.draft };
  toResult(error, {
    loggerName: "forms.draft",
    logMessage: "Draft save failed.",
    fallbackMessage: "Could not save draft.",
  });
  const kind = isAuthError(error)
    ? "auth"
    : isNetworkError(error)
      ? "offline"
      : "error";
  return { kind, message: error.error.message };
}

async function readAcknowledgedHead(
  client: DraftClient,
  formId: string,
  version: string,
): Promise<WriteResult> {
  const current = await client.get(formId);
  if (!current.success)
    return {
      kind: "error",
      message:
        "The server accepted the save, but the draft could not be read back.",
    };
  if (current.data.version !== version)
    return { kind: "stale", head: current.data, acknowledged: true };
  return { kind: "saved", head: current.data };
}

export async function saveDraftAction(
  formId: string,
  scope: string,
  request: DraftWrite,
): Promise<WriteResult> {
  const writer = await draftWriter(formId, scope);
  if (!("client" in writer)) return writer;
  const { client } = writer;
  if (!request.batch) {
    const result = await client.replace(
      formId,
      request.version,
      request.jsonData,
    );
    return result.success
      ? { kind: "saved", head: result.data }
      : failure(result);
  }
  const result = await client.append(formId, request.version, request.batch);
  if (!result.success) return failure(result);
  if (result.data.saveNo !== request.batch.saveNo)
    return {
      kind: "error",
      message: "The server did not acknowledge this save.",
    };
  return readAcknowledgedHead(client, formId, result.data.version);
}
