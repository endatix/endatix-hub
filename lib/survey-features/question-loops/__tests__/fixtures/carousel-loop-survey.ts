/**
 * Minimal shape of a reported form (hub#1377): a checkbox source on page 1 and a
 * carousel loop over it on page 2, randomized, with no add or remove buttons and
 * a checkbox inside the template. Names and texts are neutral.
 */
export const CAROUSEL_SOURCE_NAME = "attributes";
export const CAROUSEL_LOOP_NAME = "loop";
export const CAROUSEL_ITEMS = ["1", "2", "3", "4"] as const;

const SOURCE = {
  type: "checkbox",
  name: CAROUSEL_SOURCE_NAME,
  choices: CAROUSEL_ITEMS.map((value) => ({
    value,
    text: `Attribute ${value}`,
  })),
};

const LOOP = {
  type: "paneldynamic",
  name: CAROUSEL_LOOP_NAME,
  titleLocation: "hidden",
  isRequired: true,
  allowAddPanel: false,
  allowRemovePanel: false,
  displayMode: "carousel",
  loopSource: [CAROUSEL_SOURCE_NAME],
  randomizeLoop: true,
  templateElements: [
    {
      type: "checkbox",
      name: "options",
      title: "{panel.itemText}",
      isRequired: true,
      choices: ["A", "B", "C"],
      showNoneItem: true,
    },
  ],
};

export function carouselLoopSurvey(
  loopOverrides: Record<string, unknown> = {},
  sourceOverrides: Record<string, unknown> = {},
) {
  return {
    pages: [
      { name: "page1", elements: [{ ...SOURCE, ...sourceOverrides }] },
      { name: "page2", elements: [{ ...LOOP, ...loopOverrides }] },
    ],
  };
}
