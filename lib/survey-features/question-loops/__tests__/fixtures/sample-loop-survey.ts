/**
 * Reusable survey schema for question-loops tests.
 * Includes:
 * - Loop source (tagbox "brands") driving a paneldynamic "favouriteCars"
 * - visibleIf / visible on template elements (e.g. questionWhy5, InvisibleMan)
 * - exitLoopCondition and exitAllLoopsCondition for exit logic tests
 */
export const sampleLoopSurveySchema = {
  title: "Loop Logic Overrides Native Question Visibility",
  description:
    "When a Exit Current Loop trigger is activated, the current implementation manually sets the visible property of subsequent questions to false. If the user then changes the answer that triggered the exit, the logic sets the visible property back to true.",
  pages: [
    {
      name: "page1",
      elements: [
        {
          type: "tagbox",
          name: "brands",
          title: "Brands",
          choices: [
            { value: "kia", text: "Kia" },
            { value: "huyndai", text: "Huyndai" },
            { value: "honda", text: "Honda" },
            { value: "toyota", text: "Toyota" },
            { value: "nissan", text: "Nissan" },
          ],
        },
        {
          type: "paneldynamic",
          name: "favouriteCars",
          title: "Favourite Cars Loop",
          templateElements: [
            {
              type: "text",
              name: "questionTitle",
              title:
                "Because you selected {panel.itemText}, tell us your favorite model",
            },
            {
              type: "ranking",
              name: "question1",
              title: "What do you like the most in {panel.itemText}",
              choices: [
                { value: "Item 1", text: "Price" },
                { value: "Item 2", text: "Design" },
                { value: "Item 3", text: "It's a feeling" },
                { value: "Item 4", text: "Reliability" },
                { value: "Item 5", text: "Color" },
              ],
            },
            {
              type: "boolean",
              name: "areYouDone",
              title: "Are you done answering about {panel.itemText}?",
            },
            {
              type: "text",
              name: "InvisibleMan",
              visible: false,
              title: "ThisIsInvisible",
            },
            {
              type: "rating",
              name: "rating",
              title: "Last rate your experience",
            },
            {
              type: "checkbox",
              name: "questionWhy5",
              visible: false,
              visibleIf: "({panel.rating} = 5)",
              title: "Why 5",
              choices: ["Item 1", "Item 2", "Item 3"],
            },
          ],
          templateTitle: "Tell us more about {panel.itemText}",
          allowAddPanel: false,
          allowRemovePanel: false,
          loopSource: ["brands"],
          randomizeLoop: true,
          maxLoopCount: 5,
          exitLoopCondition: "{panel.areYouDone} = true",
          exitAllLoopsCondition: "{panel.rating} <= 2",
        },
      ],
    },
  ],
  showPageTitles: false,
  questionsOnPageMode: "inputPerPage",
  headerView: "advanced",
} as const;

/** Panel dynamic question name in sample survey (for tests that need to get the loop panel). */
export const SAMPLE_LOOP_PANEL_NAME = "favouriteCars" as const;

/** Source question name that drives the loop. */
export const SAMPLE_LOOP_SOURCE_NAME = "brands" as const;

/** Template element names in order (for visibility / exit-current tests). */
export const SAMPLE_TEMPLATE_ELEMENT_NAMES = [
  "questionTitle",
  "question1",
  "areYouDone",
  "InvisibleMan",
  "rating",
  "questionWhy5",
] as const;
