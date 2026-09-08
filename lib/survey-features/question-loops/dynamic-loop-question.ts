import { IJsonPropertyInfo, SurveyModel } from "survey-core";
import {
  ConditionRunnerContext,
  DynamicLoopDefinition,
  DynamicLoopModel,
  LoopExitMeta,
  SourceSelectionModes,
} from "./types";
import { isLoopQuestion } from "./loop-utils";
import {
  getLoopSourceCandidates,
  resolveLoopSourcesInScope,
} from "./utils/loop-source-scope";
import {
  formatSourceChoiceLabel,
  getStaticChoicesFromSources,
  hasDataListSource,
} from "@/lib/survey-features/data-lists/utils/property-grid-source-choices";
import { createLoopExitQuery } from "./use-cases/handle-loop-exit";

import { PANEL_QUESTION_TYPE, PANEL_VISIBILITY_SENTINEL } from "./constants";

const INITIAL_EXIT_STATE: LoopExitMeta = {
  exitAll: undefined,
  exitCurrent: undefined,
};

/**
 * Finds the loop instance an expression is being evaluated inside, by walking
 * up from the evaluating question.
 *
 * This is what makes exit state work for nested loops: `survey.getQuestionByName`
 * cannot see a loop inside a panel, and even if it could it would return one
 * shared object rather than the instance belonging to this panel. Walking the
 * context needs neither a name lookup nor a path.
 */
function findLoopInstanceInContext(
  context: ConditionRunnerContext,
  panelName: string,
): DynamicLoopModel | undefined {
  let current = context.question;

  while (current) {
    if (current.name === panelName && isLoopQuestion(current as never)) {
      return current as unknown as DynamicLoopModel;
    }
    current = current.parentQuestion;
  }

  return undefined;
}

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

  // Context first, name lookup second: the latter only ever resolves a
  // page-level loop, which is exactly the single-level case it still serves.
  const panel =
    findLoopInstanceInContext(this, panelName) ??
    (survey.getQuestionByName(panelName) as DynamicLoopModel | undefined);

  if (!panel?.exitMeta?.exitAll && !panel?.exitMeta?.exitCurrent) return false;

  const query = createLoopExitQuery(panel.exitMeta);
  const isExited = query.isExited(panelIndex, questionIndex);

  return isExited;
}

const LOOP_SOURCE_PROPERTY: IJsonPropertyInfo = {
  name: "loopSource",
  displayName: "Select source question(s)",
  category: "questionLoops",
  type: "multiplevalues",
  choices: function (
    obj: DynamicLoopModel,
    choicesCallback: (choices: { value: string; text: string }[]) => void,
  ) {
    const survey = obj ? obj.survey : null;

    if (!survey || typeof choicesCallback !== "function") {
      choicesCallback([]);
      return;
    }

    // Scoped: a question that only exists inside an unrelated panel template
    // cannot be resolved at runtime, so it is not offered here either.
    choicesCallback(getLoopSourceCandidates(obj, survey));
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
    obj: DynamicLoopModel,
    choicesCallback: (choices: { value: string; text: string }[]) => void,
  ) {
    const { survey, loopSource } = obj || {};
    if (!survey || !loopSource) return choicesCallback([]);

    const loopSourceQuestions = resolveLoopSourcesInScope(obj, survey);

    if (hasDataListSource(loopSourceQuestions)) {
      choicesCallback([]);
      return;
    }

    choicesCallback(
      getStaticChoicesFromSources(
        loopSourceQuestions,
        "",
        formatSourceChoiceLabel,
      ),
    );
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
  // Pure runtime state: it must never round-trip into saved form JSON, which
  // matters once loops nest and every panel instance carries its own (h938).
  isSerializable: false,
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
  PANEL_VISIBILITY_SENTINEL,
  INITIAL_EXIT_STATE,
  getDynamicLoopDefinition,
};
