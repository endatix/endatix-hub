import {
  IJsonPropertyInfo,
  ItemValue,
  Question,
  QuestionPanelDynamicModel,
  SurveyModel,
} from "survey-core";

/**
 * The value of a choice as defined by the ItemValue types
 */
export type ChoiceValue = ItemValue["value"];

export const LOOP_EXIT_FUNCTION_NAME = "isLoopExited" as const;

export const SourceSelectionModes = {
  SelectedOnly: "Selected Only",
  UnselectedOnly: "Unselected Only",
  All: "All",
};

type SourceSelectionMode =
  (typeof SourceSelectionModes)[keyof typeof SourceSelectionModes];

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
   * Indicates if the loop should be randomized
   */
  randomizeLoop: boolean;

  /**
   * The pattern to use for the loop choices
   * @default SourceSelectionModes.SelectedOnly
   * @see SourceSelectionModes
   * @example
   * "Selected Only" - Only selected choices will be used
   * "Unselected Only" - Only unselected choices will be used
   * "All" - All choices will be used
   */
  choicePattern: SourceSelectionMode;

  /**
   * The condition to exit the current loop
   */
  exitLoopCondition?: string;

  /**
   * The condition to exit all loops
   */
  exitAllLoopsCondition?: string;

  /**
   * The state of the loop exit
   */
  exitMeta: LoopExitMeta;

  /**
   * Indicates if the loop is ready to be used meaning all exit conditions and sources are loaded
   */
  isLoopReady?: boolean;
};

/**
 * The metadata for the loop exit. Keeps track of the triggered exit conditions and the panels that have been exited.
 */
export interface LoopExitMeta {
  /**
   * If defined, the exit all condition has been triggered
   */
  exitAll?: {
    triggeredPanelIndex: number;
  };

  /**
   * If defined, the exit current condition has been triggered
   */
  exitCurrent?: {
    // Map of panel index and its respective question index that triggered the exit current condition
    triggeredIndexMap: Record<number, number>;
  };
}

/**
 * What the survey expression engine hands a registered function as `this`.
 *
 * `question` is the element whose expression is being evaluated. It carries
 * enough of the tree to walk up to the loop instance that owns it, which is how
 * a nested loop's exit state is found — a lookup by name from the survey root
 * cannot see panel-nested loops, and could not tell instances apart if it did.
 */
type ConditionRunnerQuestion = {
  survey: SurveyModel;
  name?: string;
  getType?: () => string;
  parentQuestion?: ConditionRunnerQuestion;
};

type ConditionRunnerContext = {
  survey?: SurveyModel;
  question?: ConditionRunnerQuestion;
};

// Thе following properties will be injected into the value of each panel
// Allowing users to use them for text piping, expressions, and see them in the survey results
interface PanelItem {
  itemText: string;
  itemValue: string;
  loopIndex?: number;
}

export type {
  ConditionRunnerQuestion,
  DynamicLoopDefinition,
  DynamicLoopModel,
  ConditionRunnerContext,
  PanelItem,
  SourceSelectionMode,
};
