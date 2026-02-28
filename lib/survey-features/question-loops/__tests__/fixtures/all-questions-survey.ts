const ENDATIX_LOGO =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAIAAADYYG7QAAADA0lEQVR4nOyXa0ikVRiAn7nPDjtObTHb7iRT1tbSaiO1xCbl0i4RrrTbwkJLutgF0x8p0hUq/FFoofgjDJxMuiCRZFelzIiiJBNSMzGCQkuNKXK8po6Njl+8OjGOqKcfiSHn+TGcec/7nu857/kOw1h50OD/hHmnBdajhVRoIRVaSIUWUqGFVGghFVpIhRZSseuEDng4lY7b+a8yA5dvv9DdR/mwhIOejWev9nLdgfg4mMdXj2+/0Nb89CzFx+PjyjYKG9Ul1rVfUpw8d5bj1zA5L/VtA2RdRW4GkSgXjmExU/kRr3RKZnE2JSewmBifi9e67NSc46YrWTZ4uYP6DiruknhOugyeep+b08hM5c1vKM/Fs4dH38ZkovY8BpQ2SdUqSR16tYB7s2jtxzB4t5jUi/FdxJM5nMmk7gvmo7x4D24HJw9Tl8dvUwS/FI9VIlEyfAyEZPBSPjlHGBmX+NQ8sWWsZm70ixzQN0rZ7Tx2B8+cpiibd3oSNkkdctnlwV1DDI4xu8CthziVwcRKA0qb+HqIhUXx8F/CuRtYhvMNhGdlNjNVPg14uJnbriX8p9Sm+6j+hGC+FJa3JB1KSz9VH1NxBrOF59v4/Mek2USHXDY5FK+bE4c54pPe/j6dlLq6D5MJl4NYTLa+luxDdD4hr/AeezxtC7qGsFpkkdrP1k8lhMJzDP6B00Z1O480y3vwwXcbL9c3is3CA7dw6V6u/+cmH/WLYtEbvPdtIjO6xBX7VvzWlB/00HCBnmFmItTnby4E3Pc6Dhu9TxOqovF+adiGNHSIUzCPsRqy0uQogfbvpXbmBVof4udwPPOtbu4MSPB0IB6xmmkqlBM/W0fBa+QGKDuZtLhp3X97p032ahj0jhBZZK+Dy1L4dZKFJbmDXjcjE0Rjsu6xNBZjdP/C/hTGZmW83y2vzkCIub9kM9MRzCa5AV43n/4gj3LZCU3JXZmOSAng3yfx4fHNhXacXfdb9p+jhVRoIRVaSIUWUqGFVGghFVpIhRZS8XcAAAD//+mO5X/m2kplAAAAAElFTkSuQmCC";

/**
 * Reusable survey schema that includes all question types.
 * Includes:
 * - All question types
 * - All choice based questions have set of unique (e.g. checkbox_choice_1, buttongroup_choice_1) and repeating choices (e.g. "choice_foo", "choice_bar", "choice_baz")
 * - Endatix logo as a data URL is used for all file based elements/questions
 */

const allQuestionsSurveySchema = {
  title: "All Question Types Test Survey",
  pages: [
    {
      name: "page1",
      elements: [
        {
          type: "text",
          name: "q_text",
          title: "Text Question",
          defaultValue: "Sample text",
        },
        {
          type: "comment",
          name: "q_comment",
          title: "Comment Question",
          defaultValue: "Sample comment",
        },
        {
          type: "checkbox",
          name: "q_checkbox",
          title: "Checkbox Question",
          choices: [
            "choice_foo",
            "choice_bar",
            "choice_baz",
            "checkbox_choice_1",
            "checkbox_choice_2",
          ],
          defaultValue: ["choice_foo", "checkbox_choice_1"],
        },
        {
          type: "radiogroup",
          name: "q_radiogroup",
          title: "Radio Group Question",
          choices: [
            "choice_foo",
            "choice_bar",
            "choice_baz",
            "radiogroup_choice_1",
            "radiogroup_choice_2",
          ],
          defaultValue: "radiogroup_choice_2",
        },
        {
          type: "dropdown",
          name: "q_dropdown",
          title: "Dropdown Question",
          choices: [
            "choice_foo",
            "choice_bar",
            "choice_baz",
            "dropdown_choice_1",
            "dropdown_choice_2",
          ],
          defaultValue: "dropdown_choice_1",
        },
        {
          type: "file",
          name: "q_file",
          title: "File Upload Question",
          defaultValue: [
            {
              name: "tiny.png",
              type: "image/png",
              content: ENDATIX_LOGO,
            },
          ],
        },
        {
          type: "image",
          name: "q_image",
          title: "Image Question",
          imageLink: ENDATIX_LOGO,
        },
        {
          type: "html",
          name: "q_html",
          html: "<b>Sample HTML content</b>",
        },
        {
          type: "boolean",
          name: "q_boolean",
          title: "Boolean Question",
          defaultValue: true,
        },
        {
          type: "rating",
          name: "q_rating",
          title: "Rating Question",
          rateValues: [1, 2, 3, 4, 5, "rating_choice_1", "rating_choice_2"],
          defaultValue: 4,
        },
        {
          type: "ranking",
          name: "q_ranking",
          title: "Ranking Question",
          choices: [
            "choice_foo",
            "choice_bar",
            "choice_baz",
            "ranking_choice_1",
            "ranking_choice_2",
          ],
          defaultValue: ["ranking_choice_1", "choice_foo", "choice_bar"],
        },
        {
          type: "imagepicker",
          name: "q_imagepicker",
          title: "Image Picker Question",
          choices: [
            {
              value: "choice_foo",
              imageLink: ENDATIX_LOGO,
            },
            {
              value: "choice_bar",
              imageLink: ENDATIX_LOGO,
            },
            {
              value: "imagepicker_choice_1",
              imageLink: ENDATIX_LOGO,
            },
          ],
          defaultValue: "imagepicker_choice_1",
        },
        {
          type: "matrix",
          name: "q_matrix",
          title: "Matrix Question",
          columns: ["col_foo", "col_bar", "matrix_col_1"],
          rows: ["row_foo", "row_bar", "matrix_row_1"],
          defaultValue: {
            row_foo: "col_foo",
            row_bar: "col_bar",
            matrix_row_1: "matrix_col_1",
          },
        },
        {
          type: "matrixdropdown",
          name: "q_matrixdropdown",
          title: "Matrix Dropdown Question",
          columns: [
            {
              name: "col_foo",
              cellType: "dropdown",
              choices: [
                "choice_foo",
                "choice_bar",
                "matrixdropdown_col_foo_choice_1",
              ],
            },
          ],
          rows: ["row_foo", "row_bar", "matrixdropdown_row_1"],
          defaultValue: {
            row_foo: { col_foo: "choice_foo" },
            row_bar: { col_foo: "choice_bar" },
            matrixdropdown_row_1: {
              col_foo: "matrixdropdown_col_foo_choice_1",
            },
          },
        },
        {
          type: "matrixdynamic",
          name: "q_matrixdynamic",
          title: "Matrix Dynamic Question",
          columns: [
            { name: "col_foo", cellType: "text" },
            {
              name: "col_bar",
              cellType: "dropdown",
              choices: [
                "choice_foo",
                "choice_bar",
                "matrixdynamic_col_bar_choice_1",
              ],
            },
          ],
          defaultValue: [
            { col_foo: "foo1", col_bar: "choice_foo" },
            { col_foo: "foo2", col_bar: "matrixdynamic_col_bar_choice_1" },
          ],
        },
        {
          type: "multipletext",
          name: "q_multipletext",
          title: "Multiple Text Question",
          items: [
            { name: "item_foo", title: "Foo" },
            { name: "item_bar", title: "Bar" },
            { name: "multipletext_item_1", title: "MultipleText Item 1" },
          ],
          defaultValue: {
            item_foo: "foo value",
            item_bar: "bar value",
            multipletext_item_1: "unique value",
          },
        },
        {
          type: "expression",
          name: "q_expression",
          title: "Expression Question",
          expression: "1 + 1",
        },
        {
          type: "signaturepad",
          name: "q_signaturepad",
          title: "Signature Pad Question",
          defaultValue: ENDATIX_LOGO,
        },
        {
          type: "buttongroup",
          name: "q_buttongroup",
          title: "Button Group Question",
          choices: [
            "choice_foo",
            "choice_bar",
            "buttongroup_choice_1",
            "buttongroup_choice_2",
          ],
          defaultValue: "buttongroup_choice_2",
        },
        {
          type: "tagbox",
          name: "q_tagbox",
          title: "Tagbox Question",
          choices: [
            "choice_foo",
            "choice_bar",
            "choice_baz",
            "tagbox_choice_1",
            "tagbox_choice_2",
          ],
          defaultValue: ["choice_foo", "tagbox_choice_2"],
        },
        {
          type: "slider",
          name: "q_slider",
          title: "Slider Question",
          min: 0,
          max: 10,
          step: 1,
          defaultValue: 5,
        },
        {
          type: "panel",
          name: "q_panel",
          title: "Panel Element",
          elements: [
            {
              type: "text",
              name: "q_panel_text",
              title: "Text in Panel",
            },
          ],
        },
      ],
    },
  ],
};

export { allQuestionsSurveySchema };
