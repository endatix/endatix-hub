import {
  IJsonPropertyInfo,
  Question,
  QuestionPanelDynamicModel,
  SurveyModel,
} from "survey-core";

export const LOOP_EXIT_FUNCTION_NAME = "isLoopExited" as const;

interface DynamicLoopDefinition {
  type: string;
  properties: Array<IJsonPropertyInfo>;
  functions: {
    [LOOP_EXIT_FUNCTION_NAME]: (params: unknown[]) => boolean;
  };
  isLoopType: (question: Question) => boolean;
}

type DynamicLoopModel = QuestionPanelDynamicModel & {
  loopSource: string[];
  exitLoopCondition?: string;
  exitAllLoopsCondition?: string;
};

export interface LoopExitState {
  exitAllTriggeredPanelIndex?: number;
  exitCurrentTriggeredIndexMap?: Record<number, number>;
}

type ConditionRunnerContext = {
  survey?: SurveyModel;
  question?: { survey: SurveyModel };
};

export type { DynamicLoopDefinition, DynamicLoopModel, ConditionRunnerContext };
