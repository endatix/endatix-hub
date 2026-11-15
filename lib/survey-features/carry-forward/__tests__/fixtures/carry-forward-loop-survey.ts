/**
 * Shape of a reported form (hub#1384): a checkbox source, a hidden checkbox
 * whose default value selects all its choices, a randomized carousel loop over
 * that hidden checkbox, and a carry-forward checkbox both inside the loop and
 * outside it. Names and texts are neutral.
 */
export const SOURCE_NAME = "Q4";
export const LOOP_SOURCE_NAME = "loopItems";
export const LOOP_NAME = "loop";
export const LOOP_TARGET_NAME = "picks";
export const OUTSIDE_TARGET_NAME = "picksOutside";

export const SOURCE_ITEMS = ["1", "2", "3", "4", "5"] as const;
export const LOOP_ITEMS = ["A", "B", "C"] as const;
export const PRIORITY_ITEM = "4";
export const MAX_CHOICES = 2;

function textChoices(values: readonly string[], prefix: string) {
  return values.map((value) => ({ value, text: `${prefix} ${value}` }));
}

const SOURCE = {
  type: "checkbox",
  name: SOURCE_NAME,
  choices: textChoices(SOURCE_ITEMS, "Option"),
};

const LOOP_SOURCE = {
  type: "checkbox",
  name: LOOP_SOURCE_NAME,
  visible: false,
  choices: textChoices(LOOP_ITEMS, "Topic"),
  defaultValueExpression: `[${LOOP_ITEMS.map((item) => `'${item}'`).join(", ")}]`,
};

function carryForwardTarget(name: string) {
  return {
    type: "checkbox",
    name,
    choices: [],
    showNoneItem: true,
    noneText: "None of them",
    edxCarryForwardEnabled: true,
    edxCarryForwardSources: [SOURCE_NAME],
    edxCarryForwardMode: "selected",
    edxCarryForwardPriorityItems: [PRIORITY_ITEM],
    edxCarryForwardMaxChoices: MAX_CHOICES,
  };
}

const LOOP = {
  type: "paneldynamic",
  name: LOOP_NAME,
  titleLocation: "hidden",
  allowAddPanel: false,
  allowRemovePanel: false,
  displayMode: "carousel",
  loopSource: [LOOP_SOURCE_NAME],
  randomizeLoop: true,
  templateElements: [
    {
      ...carryForwardTarget(LOOP_TARGET_NAME),
      title: "{panel.itemText}",
    },
  ],
};

export function carryForwardLoopSurvey() {
  return {
    pages: [
      { name: "page1", elements: [SOURCE, LOOP_SOURCE] },
      { name: "page2", elements: [LOOP] },
      { name: "page3", elements: [carryForwardTarget(OUTSIDE_TARGET_NAME)] },
    ],
  };
}
