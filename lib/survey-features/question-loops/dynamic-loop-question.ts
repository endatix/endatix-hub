import { IJsonPropertyInfo, SurveyModel } from "survey-core";
import {
  ChoiceOption,
  ConditionRunnerContext,
  DynamicLoopDefinition,
  DynamicLoopModel,
  LoopExitMeta,
  SourceSelectionModes,
} from "./types";
import {
  extractUniqueChoices,
  getAllSelectBasedQuestions,
  isLoopQuestion,
  isSelectBaseQuestion,
} from "./loop-utils";
import { createLoopExitQuery } from "./use-cases/handle-loop-exit";

const PANEL_QUESTION_TYPE = "paneldynamic";
export const PANEL_VISIBILITY_SENTINEL = 9999;

const INITIAL_EXIT_STATE: LoopExitMeta = {
  exitAll: undefined,
  exitCurrent: undefined,
};

export function isLoopExitedFunction(
  this: ConditionRunnerContext,
  params: unknown[],
) {
  if (params.length < 3) return false;

  const [panelName, panelIndex, questionIndex] = params as [
    string,
    number,
    number,
  ];

  const survey: SurveyModel | undefined = this.survey ?? this.question?.survey;
  if (!survey) return false;

  const panel = survey.getQuestionByName(panelName) as DynamicLoopModel | null;
  if (!panel?.exitMeta) return false;

  const query = createLoopExitQuery(panel.exitMeta);

  return query.isExited(panelIndex, questionIndex);
}

const LOOP_SOURCE_PROPERTY: IJsonPropertyInfo = {
  name: "loopSource",
  displayName: "Select source question(s)",
  category: "questionLoops",
  type: "multiplevalues",
  choices: function (
    obj: { survey: SurveyModel },
    choicesCallback: (choices: { value: string; text: string }[]) => void,
  ) {
    const survey = obj ? obj.survey : null;

    if (!survey || typeof choicesCallback !== "function") {
      choicesCallback([]);
      return;
    }

    const filteredChoices =
      getAllSelectBasedQuestions(survey).map((selectQuestion) => ({
        value: selectQuestion.name,
        text: selectQuestion.name,
      })) || [];

    choicesCallback(filteredChoices);
  },
};

const CHOICE_PATTERN_PROPERTY: IJsonPropertyInfo = {
  name: "choicePattern",
  displayName: "Loop over",
  category: "questionLoops",
  default: SourceSelectionModes.SelectedOnly,
  onSetValue: (obj, value) => {
    obj.choicePattern = value ?? SourceSelectionModes.SelectedOnly;
  },
  type: "dropdown",
  choices: Object.values(SourceSelectionModes),
  visibleIf: isLoopQuestion,
};

const RANDOMIZE_LOOP_PROPERTY: IJsonPropertyInfo = {
  name: "randomizeLoop",
  displayName: "Randomize items",
  category: "questionLoops",
  type: "boolean",
  default: false,
  visibleIf: isLoopQuestion,
};

const MAX_LOOP_COUNT_PROPERTY: IJsonPropertyInfo = {
  name: "maxLoopCount",
  displayName: "Maximum number of loops",
  category: "questionLoops",
  type: "number",
  default: 0,
  visibleIf: isLoopQuestion,
};

const PRIORITY_ITEMS_PROPERTY: IJsonPropertyInfo = {
  name: "priorityItems",
  dependsOn: ["loopSource"],
  displayName: "Priority items",
  category: "questionLoops",
  type: "multiplevalues",
  choices: function (
    obj: { survey: SurveyModel; loopSource: string[] },
    choicesCallback: (choices: ChoiceOption[]) => void,
  ) {
    const { survey, loopSource } = obj || {};
    if (!survey || !loopSource) return choicesCallback([]);

    const loopSourceQuestions = loopSource
      .map((name) => survey.getQuestionByName(name))
      .filter(isSelectBaseQuestion);

    const uniqueChoices = extractUniqueChoices(
      loopSourceQuestions,
      (question, choice) => `${question.name}: (${choice.value})`,
    );

    choicesCallback(uniqueChoices);
  },
  visibleIf: isLoopQuestion,
};

const EXIT_LOOP_CONDITION_PROPERTY: IJsonPropertyInfo = {
  name: "exitLoopCondition",
  displayName: "Exit current loop if...",
  category: "questionLoops",
  type: "condition",
  visibleIf: isLoopQuestion,
};

const EXIT_ALL_LOOPS_CONDITION_PROPERTY: IJsonPropertyInfo = {
  name: "exitAllLoopsCondition",
  displayName: "Exit all loops if...",
  category: "questionLoops",
  type: "condition",
  visibleIf: isLoopQuestion,
};

const EXIT_META_PROPERTY: IJsonPropertyInfo = {
  name: "exitMeta",
  visible: false,
  default: INITIAL_EXIT_STATE,
};

const DEFAULT_LOOP_DEFINITION: DynamicLoopDefinition = {
  type: PANEL_QUESTION_TYPE,
  properties: [
    LOOP_SOURCE_PROPERTY,
    CHOICE_PATTERN_PROPERTY,
    RANDOMIZE_LOOP_PROPERTY,
    MAX_LOOP_COUNT_PROPERTY,
    PRIORITY_ITEMS_PROPERTY,
    EXIT_LOOP_CONDITION_PROPERTY,
    EXIT_ALL_LOOPS_CONDITION_PROPERTY,
    EXIT_META_PROPERTY,
  ],
  functions: {
    isLoopExited: isLoopExitedFunction,
  },
  isLoopType: isLoopQuestion,
};

const getDynamicLoopDefinition = (): DynamicLoopDefinition =>
  DEFAULT_LOOP_DEFINITION;

export {
  PANEL_QUESTION_TYPE,
  INITIAL_EXIT_STATE,
  type DynamicLoopDefinition,
  getDynamicLoopDefinition,
};
