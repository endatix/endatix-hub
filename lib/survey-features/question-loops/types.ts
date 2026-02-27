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
  /**
   * The sources for the loop (question names that will be used in the loop)
   */
  loopSource: string[];

  /**
   * The condition to exit the current loop
   */
  exitLoopCondition?: string;

  /**
   * The condition to exit all loops
   */
  exitAllLoopsCondition?: string;

  /**
   * Indicates if the loop is ready to be used meaning all exit conditions and sources are loaded
   */
  isLoopReady?: boolean;
};

export interface LoopExitState {
  exitAllTriggeredPanelIndex?: number;
  exitCurrentTriggeredIndexMap?: Record<number, number>;
}

type ConditionRunnerContext = {
  survey?: SurveyModel;
  question?: { survey: SurveyModel };
};

// Thе following properties will be injected into the value of each panel
// Allowing users to use them for text piping, expressions, and see them in the survey results
interface PanelItem {
  itemText: string;
  itemValue: string;
  loopIndex?: number;
}

export type {
  DynamicLoopDefinition,
  DynamicLoopModel,
  ConditionRunnerContext,
  PanelItem,
};
