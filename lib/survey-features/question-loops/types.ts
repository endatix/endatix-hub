import { QuestionPanelDynamicModel } from "survey-core";

type LoopingPanelModel = QuestionPanelDynamicModel & {
  loopSource?: string[];
  exitLoopCondition?: string;
  exitAllLoopsCondition?: string;
};

export type { LoopingPanelModel };
