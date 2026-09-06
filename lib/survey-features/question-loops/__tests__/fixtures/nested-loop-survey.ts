/**
 * Nested-loop schemas for h938.
 *
 * `nestedLoopSurveySchema` mirrors the reported JSON exactly, bare source names
 * included, so the regression it describes is asserted as reported rather than
 * as a cleaned-up variant.
 */
export const nestedLoopSurveySchema = {
  pages: [
    {
      name: "page1",
      elements: [
        {
          type: "checkbox",
          name: "question_outside_of_loop",
          title: "question_outside_of_loop",
          choices: [
            { value: "item1", text: "outside_Item 1" },
            { value: "item2", text: "outside_Item 2" },
            { value: "item3", text: "outside_Item 3" },
          ],
        },
        {
          type: "paneldynamic",
          name: "question2",
          title: "parent_loop_panel",
          templateElements: [
            {
              type: "checkbox",
              name: "question_inside_of_loop",
              title: "question_inside_of_loop",
              choices: [
                { value: "item1", text: "inside_Item 1" },
                { value: "item2", text: "inside_Item 2" },
                { value: "item3", text: "inside_Item 3" },
              ],
            },
            {
              type: "paneldynamic",
              name: "question1",
              title: "child_loop_panel",
              templateElements: [{ type: "rating", name: "question3" }],
              loopSource: ["question_inside_of_loop"],
            },
          ],
          loopSource: ["question_outside_of_loop"],
        },
      ],
    },
  ],
} as const;

export const NESTED_OUTER_SOURCE_NAME = "question_outside_of_loop" as const;
export const NESTED_OUTER_LOOP_NAME = "question2" as const;
export const NESTED_INNER_SOURCE_NAME = "question_inside_of_loop" as const;
export const NESTED_INNER_LOOP_NAME = "question1" as const;

/** The same shape, but with the inner loop using the canonical `panel.` form. */
export const panelScopedNestedSchema = {
  pages: [
    {
      elements: [
        { type: "checkbox", name: "outerSource", choices: ["a", "b", "c"] },
        {
          type: "paneldynamic",
          name: "outerLoop",
          templateElements: [
            { type: "checkbox", name: "innerSource", choices: ["x", "y", "z"] },
            {
              type: "paneldynamic",
              name: "innerLoop",
              templateElements: [{ type: "rating", name: "r" }],
              loopSource: ["panel.innerSource"],
            },
          ],
          loopSource: ["outerSource"],
        },
      ],
    },
  ],
} as const;

/** A loop inside a plain dynamic panel — no loop on the container at all. */
export const loopInPlainPanelSchema = {
  pages: [
    {
      elements: [
        {
          type: "paneldynamic",
          name: "plainPanel",
          panelCount: 2,
          templateElements: [
            { type: "checkbox", name: "src", choices: ["x", "y", "z"] },
            {
              type: "paneldynamic",
              name: "loopInPlain",
              templateElements: [{ type: "rating", name: "r" }],
              loopSource: ["panel.src"],
            },
          ],
        },
      ],
    },
  ],
} as const;

/** An inner loop driven by a page-level question rather than a sibling. */
export const innerLoopFromTopLevelSchema = {
  pages: [
    {
      elements: [
        { type: "checkbox", name: "outerSource", choices: ["a", "b"] },
        { type: "checkbox", name: "topLevelSource", choices: ["x", "y", "z"] },
        {
          type: "paneldynamic",
          name: "outerLoop",
          templateElements: [
            {
              type: "paneldynamic",
              name: "innerLoop",
              templateElements: [{ type: "rating", name: "r" }],
              loopSource: ["topLevelSource"],
            },
          ],
          loopSource: ["outerSource"],
        },
      ],
    },
  ],
} as const;

/** A bare inner source name that also exists at page level — ambiguity case. */
export const shadowedSourceNameSchema = {
  pages: [
    {
      elements: [
        { type: "checkbox", name: "outerSource", choices: ["a"] },
        { type: "checkbox", name: "shared", choices: ["top1", "top2", "top3"] },
        {
          type: "paneldynamic",
          name: "outerLoop",
          templateElements: [
            { type: "checkbox", name: "shared", choices: ["in1", "in2"] },
            {
              type: "paneldynamic",
              name: "innerLoop",
              templateElements: [{ type: "rating", name: "r" }],
              loopSource: ["shared"],
            },
          ],
          loopSource: ["outerSource"],
        },
      ],
    },
  ],
} as const;
