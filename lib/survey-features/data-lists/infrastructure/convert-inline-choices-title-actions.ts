import { isInlineChoicesQuestion } from '@/lib/survey-features/data-lists/conversion/choice-conversion.utils';
import { runConvertInlineChoicesToDataList } from '@/lib/survey-features/data-lists/infrastructure/convert-inline-choices-client';
import { Action, Question, SvgRegistry } from 'survey-core';
import type { SurveyCreatorModel } from 'survey-creator-core';

const ACTION_ID = 'endatix-convert-inline-choices-to-datalist';

let convertToolbarIconRegistered = false;

function ensureConvertToolbarIcon(): void {
  if (convertToolbarIconRegistered) {
    return;
  }
  // Lucide `database-zap` paths (registered SVG string for SurveyJS SvgRegistry).
  const icon =
    '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 15 21.84"/><path d="M21 5V8"/><path d="M21 12L18 17H22L19 22"/><path d="M3 12A9 3 0 0 0 14.59 14.87"/></svg>';
  SvgRegistry.registerIcon('icon-endatix-convert-to-datalist', icon);
  convertToolbarIconRegistered = true;
}

/**
 * Adds a toolbar icon on the **Choices** property editor (next to Fast entry / clear / add)
 * when the selected question has convertible inline choices.
 */
export function bindConvertInlineChoicesTitleActions(
  creator: SurveyCreatorModel,
): () => void {
  ensureConvertToolbarIcon();

  const handler = (
    _: SurveyCreatorModel,
    options: {
      property?: { name?: string };
      element: unknown;
      titleActions: Array<{ id?: string }>;
    },
  ) => {
    if (options.property?.name !== 'choices') {
      return;
    }

    const el = options.element;
    if (!(el instanceof Question)) {
      return;
    }

    if (!isInlineChoicesQuestion(el)) {
      return;
    }

    if (options.titleActions.some((a) => a.id === ACTION_ID)) {
      return;
    }

    options.titleActions.push(
      new Action({
        id: ACTION_ID,
        title: 'Convert inline choices to data list',
        iconName: 'icon-endatix-convert-to-datalist',
        showTitle: false,
        mode: 'small',
        iconSize: 22,
        css: 'endatix-convert-datalist-title-action',
        action: () => {
          // Defer execution so SurveyJS click handling can finish and UI can repaint
          // before React opens the confirmation dialog.
          globalThis.setTimeout(() => {
            void runConvertInlineChoicesToDataList(el);
          }, 0);
        },
      }),
    );
  };

  creator.onPropertyEditorUpdateTitleActions.add(handler);

  return () => {
    creator.onPropertyEditorUpdateTitleActions.remove(handler);
  };
}
