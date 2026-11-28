import { saveActiveDefinitionAction } from "../../edit-draft/save-active-definition.action";
import { updateFormThemeAction } from "@/features/themes/update-form-theme";
import { DEFAULT_THEME_ID } from "@/features/themes/manage-theme-editor";
import type { StoredTheme } from "@/features/themes/types";
import type { DraftAutosave } from "@/lib/survey-features/draft-autosave/controller";
import { Result, type ResultType } from "@/lib/result";

export async function saveEditorDocument(
  formId: string,
  json: string,
  draft?: DraftAutosave,
) {
  if (!draft) return saveActiveDefinitionAction(formId, json);
  await draft.resume();
  return draft.isSaved
    ? Result.success(formId)
    : Result.error("The draft has not reached the server.");
}

export async function saveEditorTheme(
  formId: string,
  current: string | undefined,
  theme: StoredTheme | undefined,
): Promise<ResultType<string | null>> {
  const selected =
    theme?.themeName?.toLowerCase() === "default"
      ? DEFAULT_THEME_ID
      : (theme?.id ?? current ?? DEFAULT_THEME_ID);
  if (selected === (current ?? DEFAULT_THEME_ID)) return Result.success(null);
  const result = await updateFormThemeAction({ formId, themeId: selected });
  if (!result) return Result.error("Could not update form theme.");
  return Result.isError(result)
    ? result
    : Result.success(theme?.themeName ?? null);
}
