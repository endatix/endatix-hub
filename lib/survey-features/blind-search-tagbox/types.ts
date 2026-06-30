import type { QuestionTagboxModel } from "survey-core";

export interface BlindSearchTagboxQuestion extends QuestionTagboxModel {
  edxHideUntilTyping?: boolean;
  edxMinSearchLength?: number;
}

export interface BlindSearchRuntimeState {
  originalShowOtherItem: boolean;
  isOtherForced: boolean;
}
