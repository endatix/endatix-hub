import "server-only";
import type { EndatixApi } from "@/lib/endatix-api";
import type { FormDraft } from "@/lib/endatix-api/forms/types";
import { Result, toResult, type ResultType } from "@/lib/result";
import { parseSurveyJson } from "@/lib/survey-js";
import type { authorization } from "@/features/auth/authorization";

export type EditorSource =
  | { kind: "active"; formJson: object | null }
  | { kind: "draft"; head: FormDraft; scope: string; userId: string };
type Access = Awaited<ReturnType<typeof authorization>>;
const readError = {
  fallbackMessage: "Could not load form for design.",
  logMessage: "Form design read failed.",
  loggerName: "forms.design",
};

export async function activeEditorSource(
  api: EndatixApi,
  form: { id: string; activeDefinitionId?: string | null },
): Promise<ResultType<EditorSource>> {
  if (!form.activeDefinitionId)
    return Result.success({ kind: "active", formJson: null });
  const result = toResult(
    await api.definitions.get(form.id, form.activeDefinitionId),
    readError,
  );
  if (Result.isError(result)) return result;
  return Result.success({
    kind: "active",
    formJson: parseSurveyJson(result.value.jsonData),
  });
}

export async function draftEditorSource(
  api: EndatixApi,
  formId: string,
  access: Access,
): Promise<ResultType<EditorSource>> {
  const [remote, actor] = await Promise.all([
    api.forms.drafts.get(formId),
    access.getAuthorizationData(),
  ]);
  const result = toResult(remote, readError);
  if (Result.isError(result)) return result;
  if (!actor.success) return Result.error(actor.error.message);
  const { userId, tenantId } = actor.data;
  return Result.success({
    kind: "draft",
    head: result.value,
    scope: JSON.stringify([tenantId, userId, formId]),
    userId,
  });
}
