import { toast } from '@/components/ui/toast';
import { convertChoicesToDataListAction } from '@/features/data-lists/convert-inline-choices/convert-choices-to-data-list.action';
import {
  getPlainChoiceValuesForNormalization,
  getQuestionDataListName,
  normalizeChoicesToDataListItems,
} from '@/lib/survey-features/data-lists/conversion/choice-conversion.utils';
import { getConvertChoicesUiDeps } from '@/lib/survey-features/data-lists/conversion/convert-inline-choices-deps';
import { Result } from '@/lib/result';
import { Question } from 'survey-core';
import { DATA_LIST_PROPERTY_NAME } from '../constants';

function applyDataListBindingOnQuestion(q: Question, dataListId: string): void {
  q.setPropertyValue(DATA_LIST_PROPERTY_NAME, dataListId);
  const rec = q as unknown as Record<string, unknown>;
  rec.choicesLazyLoadEnabled = true;
  rec.choices = [];
}

/**
 * Runs the single-question inline-choices → data list conversion (Creator UX entry points).
 */
export async function runConvertInlineChoicesToDataList(
  question: Question,
): Promise<void> {
  const uiDeps = getConvertChoicesUiDeps();
  const normalized = normalizeChoicesToDataListItems(
    getPlainChoiceValuesForNormalization(question),
  );
  if (!normalized.ok) {
    toast.error(normalized.error);
    return;
  }

  const reserved = new Set(
    (uiDeps?.getDataListNames() ?? []).map((n) => n.toLowerCase()),
  );
  const listName = getQuestionDataListName(
    { title: question.title, name: question.name },
    reserved,
  );

  const confirm = uiDeps?.confirmConvertInlineChoices;
  const ok = confirm
    ? await confirm()
    : window.confirm(
        [
          'Convert inline choices to a data list?',
          '',
          '- A new data list will be created and populated with these choices.',
          '- This question will use that data list as its choice source.',
          '- Inline choices will be removed from the question.',
          '- Save the form to persist this change.',
        ].join('\n'),
      );
  if (!ok) {
    return;
  }

  const result = await convertChoicesToDataListAction({
    name: listName,
    items: normalized.items,
  });

  if (!Result.isSuccess(result)) {
    toast.error(result.message);
    return;
  }

  applyDataListBindingOnQuestion(question, result.value.dataList.id);
  await uiDeps?.refreshDataLists();
  uiDeps?.markFormModified();
  toast.success('Data list created and attached. Save the form when ready.');
}
