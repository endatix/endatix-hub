import { QuestionSelectBase } from "survey-core";
import { notifyLazySelectedItemLocaleStrings } from "./apply-multilingual-choice-display-values";

const WRAPPED_FLAG = "__endatixLazySelectedLocStrsChanged";

type SelectBaseLocStrsProto = typeof QuestionSelectBase.prototype & {
  locStrsChanged: () => void;
  [WRAPPED_FLAG]?: boolean;
};

/**
 * SurveyJS `QuestionSelectBase.locStrsChanged` notifies `choicesFromUrl` and
 * native carry-forward `visibleChoices`, but not lazy-load `selectedItemValues`.
 * Tagbox chips / dropdown selected loc text bind those LocStrings, so wrap the
 * same method the locale cascade already calls (survey → page → question).
 */
export function wrapSelectBaseLocStrsChangedForLazyLoad(): void {
  const proto = QuestionSelectBase.prototype as SelectBaseLocStrsProto;
  if (proto[WRAPPED_FLAG]) {
    return;
  }

  const originalLocStrsChanged = proto.locStrsChanged;
  proto.locStrsChanged = function (this: QuestionSelectBase): void {
    originalLocStrsChanged.call(this);
    notifyLazySelectedItemLocaleStrings(this);
  };
  proto[WRAPPED_FLAG] = true;
}
