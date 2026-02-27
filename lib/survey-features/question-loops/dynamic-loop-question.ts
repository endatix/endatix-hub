import {
  IJsonPropertyInfo,
  ItemValue,
  Question,
  QuestionSelectBase,
  SurveyModel,
} from "survey-core";
import {
  ConditionRunnerContext,
  DynamicLoopDefinition,
  LoopExitState,
} from "./types";
import { isLoopQuestion } from "./loop-utils";

const PANEL_QUESTION_TYPE = "paneldynamic";
export const PANEL_VISIBILITY_SENTINEL = 9999;

export function isLoopExitedfunction(
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

  const panel = survey.getQuestionByName(panelName) as {
    exitMeta?: LoopExitState;
  } | null;
  if (!panel?.exitMeta) return false;

  const meta = panel.exitMeta;

  // Exit All: hide panels after the trigger panel
  if (
    meta.exitAllTriggeredPanelIndex !== undefined &&
    panelIndex > meta.exitAllTriggeredPanelIndex
  ) {
    return true;
  }

  // Exit Current: hide only elements after the trigger (panel uses sentinel, so skip)
  if (
    questionIndex !== PANEL_VISIBILITY_SENTINEL &&
    meta.exitCurrentTriggeredIndexMap?.[panelIndex] !== undefined
  ) {
    if (questionIndex > meta.exitCurrentTriggeredIndexMap[panelIndex]) {
      return true;
    }
  }

  return false;
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

    const questions = survey.getAllQuestions();
    const filteredChoices = [{ value: "", text: "None" }];

    questions
      .filter((q: Question): q is QuestionSelectBase => {
        const type = q.getType();
        return ["checkbox", "tagbox", "radiogroup"].includes(type);
      })
      .forEach((q) => {
        filteredChoices.push({
          value: q.name,
          text: q.name,
        });
      });

    choicesCallback(filteredChoices);
  },
};

const CHOICE_PATTERN_PROPERTY: IJsonPropertyInfo = {
  name: "choicePattern",
  displayName: "Loop over",
  category: "questionLoops",
  default: "Selected Only",
  onSetValue: (obj, value) => {
    obj.choicePattern = value ?? "Selected Only";
  },
  type: "dropdown",
  choices: ["Selected Only", "Unselected Only"],
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
    choicesCallback: (choices: { value: string; text: string }[]) => void,
  ) {
    const { survey, loopSource } = obj || {};
    if (!survey || !loopSource) return choicesCallback([]);

    const allChoices: { value: string; text: string }[] = [];

    loopSource
      .map((name) => survey.getQuestionByName(name))
      .filter((q): q is QuestionSelectBase => !!q && "choices" in q)
      .forEach((q) => {
        q.choices.forEach((c: ItemValue) => {
          if (!allChoices.some((existing) => existing.value === c.value)) {
            allChoices.push({
              value: c.value,
              text: String(c.value),
            });
          }
        });
      });

    choicesCallback(allChoices);
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
  default: { exitCurrentTriggeredIndexMap: {} },
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
    isLoopExited: isLoopExitedfunction,
  },
  isLoopType: isLoopQuestion,
};

const getDynamicLoopDefinition = (): DynamicLoopDefinition =>
  DEFAULT_LOOP_DEFINITION;

export {
  PANEL_QUESTION_TYPE,
  type DynamicLoopDefinition,
  getDynamicLoopDefinition,
};
