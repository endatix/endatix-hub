import { saveActiveDefinitionAction } from "../../edit-draft/save-active-definition.action";
import { updateFormThemeAction } from "@/features/themes/update-form-theme";
import { DEFAULT_THEME_ID } from "@/features/themes/manage-theme-editor";
import type { StoredTheme } from "@/features/themes";
import type { DraftAutosave } from "@/lib/survey-features/draft-autosave/controller";
import { Result, type ResultType } from "@/lib/result";
import { useContext, useRef, useCallback } from "react";
import { keepLegacyEdit } from "@/lib/survey-features/draft-autosave/idb-draft-store";
import { downloadText } from "@/lib/utils/files-download";

import { LegacyScope } from "../../edit-draft/draft-editor-context";

export function useSaveEditorDocument(formId: string, draft?: DraftAutosave) {
  const scope = useContext(LegacyScope);
  const session = useRef<string | undefined>(undefined);
  return useCallback(async (json: string) => {
    if (draft) {
      // Some Creator extensions change the document without producing a journal emission.
      if (draft.localDocument !== json) draft.edit(json);
      await draft.resume();
      return draft.isSaved ? Result.success(formId) : Result.error("The draft has not reached the server.");
    }
    const saved = await saveActiveDefinitionAction(formId, json);
    if (!Result.isError(saved) || saved.errorCode !== "editor_mode_changed") return saved;
    session.current ??= crypto.randomUUID();
    return preserveOnCutover({formId, scope}, session.current, json);
  }, [scope, formId, draft]);
}

async function preserveOnCutover(editor: { formId: string; scope: string }, sessionId: string, json: string) {
  try {
    await keepLegacyEdit(editor.scope, sessionId, json);
    return Result.error("Draft editing is now enabled. Reopen the designer to restore the changes kept on this device.");
  } catch {
    downloadText(json, `form-${editor.formId}.json`, "application/json");
    return Result.error("Draft editing is now enabled. Keep the downloaded JSON and import it after reopening the designer.");
  }
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
