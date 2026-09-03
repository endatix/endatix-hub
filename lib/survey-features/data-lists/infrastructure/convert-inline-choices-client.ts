import { toast } from "@/components/ui/toast";
import { convertChoicesToDataListAction } from "@/features/data-lists/convert-inline-choices/convert-choices-to-data-list.action";
import type { DataList } from "@/lib/endatix-api/data-lists/types";
import {
  applyDataListBindingOnQuestion,
  DATA_LIST_NAME_MAX_LENGTH,
  getQuestionDataListName,
  normalizeQuestionChoicesToDataListItems,
} from "@/lib/survey-features/data-lists/utils";
import {
  getConvertChoicesUiDeps,
  type ConvertChoicesUiDeps,
} from "@/lib/survey-features/data-lists/conversion/convert-inline-choices-deps";
import { Result } from "@/lib/result";
import { Question } from "survey-core";

const DATA_LIST_NAME_ALREADY_EXISTS_ERROR_CODE =
  "data_list_name_already_exists";

async function getDefaultDataListName(
  question: Question,
  uiDeps: ConvertChoicesUiDeps | null,
): Promise<string> {
  const namingSource = {
    title: question.title,
    name: question.name,
    type: question.getType(),
  };
  const seedName = getQuestionDataListName(namingSource, new Set());
  const matchingNames = await uiDeps?.searchDataListNames(seedName);
  const reservedNames = new Set(
    (matchingNames ?? []).map((name) => name.toLowerCase()),
  );

  return getQuestionDataListName(namingSource, reservedNames);
}

async function askForDataListName(
  uiDeps: ConvertChoicesUiDeps | null,
  initialName: string,
  errorMessage: string | undefined,
): Promise<string | null> {
  const confirm = uiDeps?.confirmConvertInlineChoices;
  if (confirm) {
    return confirm({ initialName, errorMessage });
  }

  return globalThis.window?.prompt?.("Data list name", initialName) ?? null;
}

function normalizePickedName(name: string): string {
  return name.trim().slice(0, DATA_LIST_NAME_MAX_LENGTH);
}

function isDuplicateDataListNameError(result: { errorCode?: string }): boolean {
  return result.errorCode === DATA_LIST_NAME_ALREADY_EXISTS_ERROR_CODE;
}

function completeConversion(
  question: Question,
  dataList: Pick<DataList, "id" | "name">,
  uiDeps: ConvertChoicesUiDeps | null,
): void {
  if (uiDeps?.completeDataListBinding) {
    uiDeps.completeDataListBinding(question, dataList);
  } else {
    applyDataListBindingOnQuestion(question, dataList.id);
  }

  void uiDeps?.refreshDataLists();
  uiDeps?.markFormModified();
  toast.success("Data list created and attached. Save the form when ready.");
}

/**
 * Runs the single-question inline-choices → data list conversion (Creator UX entry points).
 */
export async function runConvertInlineChoicesToDataList(
  question: Question,
): Promise<void> {
  const uiDeps = getConvertChoicesUiDeps();
  const normalized = normalizeQuestionChoicesToDataListItems(question);
  if (!normalized.ok) {
    toast.error(normalized.error);
    return;
  }

  let proposedName = await getDefaultDataListName(question, uiDeps);
  let nameError: string | undefined;

  for (;;) {
    const pickedName = await askForDataListName(
      uiDeps,
      proposedName,
      nameError,
    );
    if (pickedName === null || pickedName === undefined) {
      return;
    }

    const finalName = normalizePickedName(pickedName);
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
      if (!isDuplicateDataListNameError(result)) {
        toast.error(result.message);
        return;
      }

      await uiDeps?.refreshDataLists();
      proposedName = finalName;
      nameError = result.message;
      continue;
    }

    completeConversion(question, result.value.dataList, uiDeps);
    return;
  }
}
