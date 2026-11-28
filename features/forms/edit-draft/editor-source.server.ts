import "server-only";
import type { EndatixApi } from "@/lib/endatix-api";
import type { FormDraft } from "@/lib/endatix-api/forms/types";
import { Result, toResult, type ResultType } from "@/lib/result";
import { parseSurveyJson } from "@/lib/survey-js";
import { type authorization, Permissions } from "@/features/auth/authorization";
import { formPublishFlag } from "@/lib/feature-flags/form-publish.server";

export type EditorSource =
  | { kind: "active"; formJson: object | null; scope: string }
  | { kind: "draft"; head: FormDraft; scope: string; userId: string };
type Access = Awaited<ReturnType<typeof authorization>>;
type EditorForm = { id: string; activeDefinitionId?: string | null };
const readError = {
  fallbackMessage: "Could not load form for design.",
  logMessage: "Form design read failed.",
  loggerName: "forms.design",
};

export async function loadEditorSource(api: EndatixApi, form: EditorForm, access: Access) {
  if (!await formPublishFlag()) return activeEditorSource(api, form, access);
  await access.requirePermission(Permissions.Forms.Edit);
  return draftEditorSource(api, form.id, access);
}

async function activeEditorSource(
  api: EndatixApi,
  form: EditorForm,
  access: Access,
): Promise<ResultType<EditorSource>> {
  const actor = await access.getAuthorizationData();
  if (!actor.success) return Result.error(actor.error.message);
  const scope = JSON.stringify([actor.data.tenantId, actor.data.userId, form.id]);
  if (!form.activeDefinitionId)
    return Result.success({ kind: "active", formJson: null, scope });
  const result = toResult(
    await api.definitions.get(form.id, form.activeDefinitionId),
    readError,
  );
  if (Result.isError(result)) return result;
  const formJson = parseSurveyJson(result.value.jsonData);
  return Result.success({ kind: "active", scope, formJson });
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
