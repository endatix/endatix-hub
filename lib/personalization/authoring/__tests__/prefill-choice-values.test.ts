import { describe, expect, it } from "vitest";
import { ItemValue, type QuestionSelectBase } from "survey-core";
import { SurveyCreatorModel } from "survey-creator-core";
import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { bindAudienceToCreator } from "..";

const SCORE = {
  type: "dropdown",
  name: "score",
  title: "Score",
  choices: ["1", "2", "3", "4", "5", "6", "7", "8"],
  prefillTargets: [
    { type: "dropdown" },
    { type: "radiogroup" },
    { type: "buttongroup" },
  ],
};
const TOPICS = {
  type: "checkbox",
  name: "topics",
  title: "Topics",
  choices: ["1", "2", "5"],
  prefillTargets: [{ type: "checkbox" }, { type: "tagbox" }],
};
const AGE = {
  type: "text",
  name: "age",
  title: "Age",
  inputType: "number",
  prefillTargets: [{ type: "text", inputType: "number" }, { type: "rating" }],
};

function variables(values: unknown[], variable: string): AudienceVariables {
  const presets = values.map((value, index) => ({
    name: `p${index + 1}`,
    variables: { [variable]: value },
  }));
  return {
    variablePresets: {
      definition: { elements: [SCORE, TOPICS, AGE] },
      presets,
      totalPresets: presets.length,
    },
    coverage: {
      participants: { test: presets.length, real: 0 },
      properties: [],
    },
    editing: { allowAdd: false, allowEdit: false, allowDelete: false },
    readOnlyPresets: [],
  };
}

type Participants = { variable?: string; reads?: unknown[][] };

/** The designer bound to participants holding `values`; `reads` are what each refresh returns next. */
function designer(
  json: object,
  values: unknown[],
  { variable = "score", reads = [] }: Participants = {},
) {
  const creator = new SurveyCreatorModel({});
  creator.JSON = json;
  const later = reads.map((read) => variables(read, variable));
  const binding = bindAudienceToCreator(creator, {
    variables: variables(values, variable),
    refresh: () =>
      Promise.resolve(
        Result.success(later.shift() ?? variables(values, variable)),
      ),
  });
  return { creator, binding };
}

type Warning = { isVisible: boolean; html: string };

function open(creator: SurveyCreatorModel, name: string) {
  const question = creator.survey.getQuestionByName(name) as QuestionSelectBase;
  creator.selectElement(question);
  const grid = creator.propertyGrid;
  return {
    question,
    prefill: grid.getQuestionByName("edxPrefillFrom"),
    warning: () =>
      grid.getQuestionByName(
        "edxPrefillFrom_values",
      ) as unknown as Warning | null,
  };
}

function shown(warning: Warning | null): string | undefined {
  return warning?.isVisible ? warning.html : undefined;
}

type DropdownEditor = {
  dropdownListModel: {
    popupModel: { toggleVisibility: () => void };
    listModel: { actions: ItemValue[] };
  };
};

/** Whether the open Prefill from popup lets the author pick `value`. */
function enabled(prefill: unknown, value: string): boolean | undefined {
  const list = (prefill as DropdownEditor).dropdownListModel;
  list.popupModel.toggleVisibility();
  const row = list.listModel.actions.find((item) => item.value === value);
  list.popupModel.toggleVisibility();
  return row?.isEnabled;
}

const DEFAULT_CHOICES = ["Item 1", "Item 2", "Item 3"];

function radio(choices: unknown[], extra: object = {}) {
  return {
    elements: [
      {
        type: "radiogroup",
        name: "rating",
        choices,
        defaultValueExpression: "{score}",
        ...extra,
      },
    ],
  };
}

describe("Prefill from on a choice question", () => {
  it("names, in order, the participants' values that no choice has", () => {
    // Arrange
    const { creator } = designer(
      {
        elements: [
          { type: "radiogroup", name: "rating", choices: DEFAULT_CHOICES },
        ],
      },
      ["8", "1", "2", "2", "Item 1"],
    );

    // Act
    const rating = open(creator, "rating");
    rating.prefill!.value = "score";

    // Assert
    const text = shown(rating.warning());
    expect(text).toContain("No choice has the value 1, 2 or 8.");
    expect(text).toContain(
      "Participants with these Score values start with nothing selected.",
    );
  });

  it("shows nothing when every participant's value has a choice", () => {
    // Arrange
    const { creator } = designer(
      {
        elements: [
          {
            type: "dropdown",
            name: "rating",
            choices: [1, 2, 3],
            defaultValueExpression: "{score}",
          },
        ],
      },
      [1, "2", 3, null, ""],
    );

    // Act
    const rating = open(creator, "rating");

    // Assert
    expect(shown(rating.warning())).toBeUndefined();
  });

  it("shows a participant's value as text, never as markup or a variable", () => {
    // Arrange
    const { creator } = designer(radio(DEFAULT_CHOICES), [
      '<b>"x"</b> {score}',
    ]);

    // Act
    const text = shown(open(creator, "rating").warning());

    // Assert
    expect(text).toContain("&lt;b&gt;&quot;x&quot;&lt;/b&gt; &#123;score}");
  });

  it("checks each value a multiple-choice participant holds", () => {
    // Arrange
    const { creator } = designer(
      {
        elements: [
          {
            type: "checkbox",
            name: "picked",
            choices: [1, 2],
            defaultValueExpression: "{topics}",
          },
        ],
      },
      [
        ["1", "2"],
        ["2", "5"],
      ],
      { variable: "topics" },
    );

    // Act
    const picked = open(creator, "picked");

    // Assert
    expect(shown(picked.warning())).toContain("No choice has the value 5.");
  });

  it("lists six values in full, and past six the first five and a count", () => {
    // Arrange
    const six = designer(radio(DEFAULT_CHOICES), [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
    ]).creator;
    const eight = designer(radio(DEFAULT_CHOICES), [
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
    ]).creator;

    // Act
    const sixText = shown(open(six, "rating").warning());
    const eightText = shown(open(eight, "rating").warning());

    // Assert
    expect(sixText).toContain("No choice has the value 1, 2, 3, 4, 5 or 6.");
    expect(eightText).toContain(
      "No choice has the value 1, 2, 3, 4, 5 or 3 other values.",
    );
  });

  it("counts None as a choice, and says nothing when Other or custom choices take any value", () => {
    // Arrange
    const none = designer(radio([1], { showNoneItem: true }), [
      "1",
      "none",
    ]).creator;
    const other = designer(radio([1], { showOtherItem: true }), [
      "1",
      "7",
    ]).creator;
    const custom = designer(
      {
        elements: [
          {
            type: "dropdown",
            name: "rating",
            choices: [1],
            allowCustomChoices: true,
            defaultValueExpression: "{score}",
          },
        ],
      },
      ["1", "7"],
    ).creator;

    // Act
    const noneText = shown(open(none, "rating").warning());
    const otherText = shown(open(other, "rating").warning());
    const customText = shown(open(custom, "rating").warning());

    // Assert
    expect(noneText).toBeUndefined();
    expect(otherText).toBeUndefined();
    expect(customText).toBeUndefined();
  });

  it("follows a choice added or a choice value edited in place", () => {
    // Arrange
    const { creator } = designer(radio(["1"]), ["1", "2", "3"]);
    const rating = open(creator, "rating");

    // Act
    rating.question.choices.push(new ItemValue("2"));
    const afterAdd = shown(rating.warning());
    rating.question.choices[1].value = "3";
    const afterEdit = shown(rating.warning());

    // Assert
    expect(afterAdd).toContain("No choice has the value 3.");
    expect(afterEdit).toContain("No choice has the value 2.");
  });

  it("follows the participants read again", async () => {
    // Arrange
    const { creator, binding } = designer(radio(["1"]), ["1"], {
      reads: [["1", "4"]],
    });
    const rating = open(creator, "rating");
    const before = shown(rating.warning());

    // Act
    await binding.refresh();

    // Assert
    expect(before).toBeUndefined();
    expect(shown(rating.warning())).toContain("No choice has the value 4.");
  });

  it("hides the warning when the prefill is cleared", () => {
    // Arrange
    const { creator } = designer(radio(["1"]), ["1", "2"]);
    const rating = open(creator, "rating");

    // Act
    rating.prefill!.value = undefined;

    // Assert
    expect(shown(rating.warning())).toBeUndefined();
  });

  it("keeps greying a Property that does not fit, beside the warning", () => {
    // Arrange
    const { creator } = designer(radio(DEFAULT_CHOICES), ["1"]);

    // Act
    const rating = open(creator, "rating");

    // Assert
    expect(shown(rating.warning())).toContain("No choice has the value 1.");
    expect(enabled(rating.prefill, "score")).toBe(true);
    expect(enabled(rating.prefill, "age")).toBe(false);
  });

  it("says nothing on a question that is not a choice question", () => {
    // Arrange
    const { creator } = designer(
      {
        elements: [
          {
            type: "text",
            name: "plain",
            inputType: "number",
            defaultValueExpression: "{age}",
          },
        ],
      },
      [42],
      { variable: "age" },
    );

    // Act
    const plain = open(creator, "plain");

    // Assert
    expect(shown(plain.warning())).toBeUndefined();
  });
});
