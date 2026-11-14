/**
 * Minimal shape of a reported form (hub#1385): one-input-per-page layout with a
 * dynamic matrix, a plain dynamic panel, and a question loop. Names and texts
 * are neutral.
 */
export const MATRIX_NAME = "items";
export const PLAIN_PANEL_NAME = "entries";
export const LOOP_SOURCE_NAME = "attributes";
export const LOOP_NAME = "loop";
export const OUTER_PANEL_NAME = "groups";
export const NESTED_LOOP_NAME = "nestedLoop";
export const LOOP_MATRIX_NAME = "loopItems";

const LOOP_CHOICES = ["1", "2"].map((value) => ({
  value,
  text: `Attribute ${value}`,
}));

export const matrixSurvey = {
  questionsOnPageMode: "inputPerPage",
  pages: [
    {
      elements: [
        {
          type: "matrixdynamic",
          name: MATRIX_NAME,
          rowCount: 1,
          columns: [{ name: "label", cellType: "text" }],
        },
      ],
    },
  ],
};

export const plainPanelSurvey = {
  questionsOnPageMode: "inputPerPage",
  pages: [
    {
      elements: [
        {
          type: "paneldynamic",
          name: PLAIN_PANEL_NAME,
          panelCount: 1,
          templateElements: [{ type: "text", name: "label" }],
        },
      ],
    },
  ],
};

export const loopSurvey = {
  questionsOnPageMode: "inputPerPage",
  pages: [
    {
      elements: [
        { type: "checkbox", name: LOOP_SOURCE_NAME, choices: LOOP_CHOICES },
      ],
    },
    {
      elements: [
        {
          type: "paneldynamic",
          name: LOOP_NAME,
          loopSource: [LOOP_SOURCE_NAME],
          templateElements: [
            { type: "text", name: "rating", title: "{panel.itemText}" },
          ],
        },
      ],
    },
  ],
};

/** A loop inside a plain dynamic panel: the outer panel is not a loop. */
export const nestedLoopSurvey = {
  questionsOnPageMode: "inputPerPage",
  pages: [
    {
      elements: [
        {
          type: "paneldynamic",
          name: OUTER_PANEL_NAME,
          panelCount: 1,
          templateElements: [
            { type: "checkbox", name: LOOP_SOURCE_NAME, choices: LOOP_CHOICES },
            {
              type: "paneldynamic",
              name: NESTED_LOOP_NAME,
              loopSource: [LOOP_SOURCE_NAME],
              templateElements: [{ type: "text", name: "rating" }],
            },
          ],
        },
      ],
    },
  ],
};

/** A dynamic matrix inside a question loop: the matrix is not a loop. */
export const matrixInLoopSurvey = {
  questionsOnPageMode: "inputPerPage",
  pages: [
    {
      elements: [
        { type: "checkbox", name: LOOP_SOURCE_NAME, choices: LOOP_CHOICES },
      ],
    },
    {
      elements: [
        {
          type: "paneldynamic",
          name: LOOP_NAME,
          loopSource: [LOOP_SOURCE_NAME],
          templateElements: [
            {
              type: "matrixdynamic",
              name: LOOP_MATRIX_NAME,
              rowCount: 1,
              columns: [{ name: "label", cellType: "text" }],
            },
          ],
        },
      ],
    },
  ],
};
