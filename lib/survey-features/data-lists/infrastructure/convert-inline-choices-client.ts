import { toast } from "@/components/ui/toast";
import { convertChoicesToDataListAction } from "@/features/data-lists/convert-inline-choices/convert-choices-to-data-list.action";
import {
  DATA_LIST_NAME_MAX_LENGTH,
  getPlainChoiceValuesForNormalization,
  getQuestionDataListName,
  normalizeChoicesToDataListItems,
} from "@/lib/survey-features/data-lists/utils";
import { getConvertChoicesUiDeps } from "@/lib/survey-features/data-lists/conversion/convert-inline-choices-deps";
import { Result } from "@/lib/result";
import { Question } from "survey-core";
import { DATA_LIST_PROPERTY_NAME } from "../constants";

function applyDataListBindingOnQuestion(q: Question, dataListId: string): void {
  q.setPropertyValue(DATA_LIST_PROPERTY_NAME, dataListId);
  q.setPropertyValue("choicesLazyLoadEnabled", true);
  q.setPropertyValue("choices", []);
}

function isNameValidationError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("name") &&
    (m.includes("already exists") ||
      m.includes("must be") ||
      m.includes("required") ||
      m.includes("length") ||
      m.includes("characters or fewer"))
  );
}

/**
 * Runs the single-question inline-choices → data list conversion (Creator UX entry points).
 */
export async function runConvertInlineChoicesToDataList(
  question: Question,
): Promise<void> {
  const uiDeps = getConvertChoicesUiDeps();

  const getReservedNames = () =>
    new Set((uiDeps?.getDataListNames() ?? []).map((n) => n.toLowerCase()));

  const reserved = getReservedNames();
  const defaultListName = getQuestionDataListName(
    { title: undefined, name: question.name },
    reserved,
  );

  const normalized = normalizeChoicesToDataListItems(
    getPlainChoiceValuesForNormalization(question),
  );
  if (!normalized.ok) {
    toast.error(normalized.error);
    return;
  }

  const confirm = uiDeps?.confirmConvertInlineChoices;
  let proposedName = defaultListName;
  let nameError: string | undefined;

  for (;;) {
    const pickedName = confirm
      ? await confirm({ initialName: proposedName, errorMessage: nameError })
      : (globalThis.window?.prompt?.("Data list name", proposedName) ?? null);
    if (pickedName === null || pickedName === undefined) {
      return;
    }

    const finalName = pickedName.trim().slice(0, DATA_LIST_NAME_MAX_LENGTH);
    if (!finalName) {
      proposedName = pickedName;
      nameError = "Name is required.";
      continue;
    }

    const result = await convertChoicesToDataListAction({
      name: finalName,
      items: normalized.items,
    });

    if (!Result.isSuccess(result)) {
      if (isNameValidationError(result.message)) {
        await uiDeps?.refreshDataLists();
        proposedName = finalName;
        nameError = result.message;
        continue;
      }
      toast.error(result.message);
      return;
    }

    applyDataListBindingOnQuestion(question, result.value.dataList.id);
    await uiDeps?.refreshDataLists();
    uiDeps?.markFormModified();
    toast.success("Data list created and attached. Save the form when ready.");
    return;
  }
}
