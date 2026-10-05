import { beforeEach, describe, expect, it } from "vitest";
import {
  Helpers,
  ItemValue,
  QuestionCommentModel,
  QuestionMatrixDynamicModel,
  QuestionSelectBase,
  Serializer,
  SurveyModel,
} from "survey-core";
import {
  PropertyGridEditorCollection,
  SurveyCreatorModel,
} from "survey-creator-core";
import addRandomizeGroupFeature from "../features/group-randomization";

describe("Randomize checkbox in the choices editor", () => {
  beforeEach(() => {
    addRandomizeGroupFeature();
  });

  function radiogroupChoice(choicesOrder: string): ItemValue {
    const survey = new SurveyModel({
      elements: [
        {
          type: "radiogroup",
          name: "q1",
          choicesOrder,
          choices: ["a"],
        },
      ],
    });
    const question = survey.getQuestionByName("q1");
    if (!(question instanceof QuestionSelectBase)) {
      throw new Error("Expected a choice question");
    }
    return question.choices[0];
  }

  it("shows itemvalue.randomize as a column only while choice order is random", () => {
    // Arrange
    const randomizeProperty = Serializer.findProperty("itemvalue", "randomize");
    const randomChoice = radiogroupChoice("random");
    const orderedChoice = radiogroupChoice("none");

    // Act
    const visibleWhenRandom = randomizeProperty?.visibleIf(randomChoice);
    const visibleWhenOrdered = randomizeProperty?.visibleIf(orderedChoice);

    // Assert
    expect(randomizeProperty?.visible).toBe(true);
    expect(randomizeProperty?.locationInTable).toBe("column");
    expect(visibleWhenRandom).toBe(true);
    expect(visibleWhenOrdered).toBe(false);
  });

  it("places group in the choices table column", () => {
    // Arrange
    const groupProperty = Serializer.findProperty("itemvalue", "group");

    // Act & Assert
    expect(groupProperty?.locationInTable).toBe("column");
  });

  it("leaves the question-level randomize property hidden", () => {
    // Arrange
    const questionRandomize = Serializer.findProperty("question", "randomize");

    // Act & Assert
    expect(questionRandomize?.visible).toBe(false);
  });

  function choicesColumnNames(choicesOrder?: string): string[] {
    const creator = new SurveyCreatorModel({});
    const element: {
      type: string;
      name: string;
      choices: string[];
      choicesOrder?: string;
    } = {
      type: "radiogroup",
      name: "q1",
      choices: ["a", "b"],
    };
    if (choicesOrder) {
      element.choicesOrder = choicesOrder;
    }
    creator.JSON = { elements: [element] };
    creator.selectElement(creator.survey.getQuestionByName("q1"));
    const choices = creator.propertyGrid.getQuestionByName(
      "choices",
    ) as QuestionMatrixDynamicModel;
    // visibleColumns is built from the row objects and stays ["value", "text"]
    // until visibleRows is read.
    void choices.visibleRows.length;
    return choices.visibleColumns.map((column) => column.name);
  }

  it("adds the randomize column to the choices table when choice order is random", () => {
    // Act
    const columns = choicesColumnNames("random");

    // Assert
    expect(columns).toContain("randomize");
    expect(columns).toContain("group");
  });

  it("keeps the choices table to value and text when choice order is unset", () => {
    // Act & Assert
    expect(choicesColumnNames()).toEqual(["value", "text"]);
  });
});

describe("Per-item pin inside a group", () => {
  const PIN_SEEDS = [11, 22, 33, 44, 55, 66];

  function groupedChoice(value: string, randomize: boolean): ItemValue {
    const item = new ItemValue(value);
    item.randomize = randomize;
    item.setPropertyValue("group", "A");
    return item;
  }

  beforeEach(() => {
    addRandomizeGroupFeature();
  });

  it("keeps a pinned choice in place and still shuffles the rest of its group", () => {
    // Act - core leaves randomize === false items at their index. This fails
    // if a survey-core upgrade shuffles those slots too.
    const orders = PIN_SEEDS.map((seed) =>
      Helpers.randomizeArray(
        [
          groupedChoice("a1", false),
          groupedChoice("a2", true),
          groupedChoice("a3", true),
          groupedChoice("a4", true),
        ],
        seed,
      ).map((item) => String(item.value)),
    );

    // Assert
    orders.forEach((order) => expect(order[0]).toBe("a1"));
    expect(
      new Set(orders.map((order) => order.slice(1).join(","))).size,
    ).toBeGreaterThan(1);
  });
});

describe("Manual Entry round trip", () => {
  beforeEach(() => {
    addRandomizeGroupFeature();
  });

  function selectRadiogroup(choices: unknown[], choicesOrder?: string) {
    const creator = new SurveyCreatorModel({});
    const element: Record<string, unknown> = {
      type: "radiogroup",
      name: "q1",
      choices,
    };
    if (choicesOrder) {
      element.choicesOrder = choicesOrder;
    }
    creator.JSON = { elements: [element] };
    const question = creator.survey.getQuestionByName("q1") as QuestionSelectBase;
    creator.selectElement(question);
    return { creator, question };
  }

  function choicesTable(creator: SurveyCreatorModel) {
    const table = creator.propertyGrid.getQuestionByName(
      "choices",
    ) as QuestionMatrixDynamicModel;
    // visibleColumns is built from the row objects and stays ["value", "text"]
    // until visibleRows is read.
    void table.visibleRows.length;
    return table;
  }

  /**
   * The dialog behind the Manual Entry action. Its field list comes from
   * `question.columns`, which holds every visible column whatever its
   * `visibleIf` says, so it reaches choices tables that are not randomized.
   */
  function openManualEntry(creator: SurveyCreatorModel, question: QuestionSelectBase) {
    const property = Serializer.findProperty("radiogroup", "choices");
    const editor = PropertyGridEditorCollection.getEditor(property);
    const setup = editor.createPropertyEditorSetup?.(
      question,
      property,
      choicesTable(creator),
      creator,
    );
    if (!setup) {
      throw new Error("Expected a Manual Entry editor for choices");
    }
    const text = setup.editSurvey.getQuestionByName(
      "question",
    ) as QuestionCommentModel;
    return { setup, text };
  }

  it("leaves a non-randomized question untouched when applied unchanged", () => {
    // Arrange
    const { creator, question } = selectRadiogroup([
      { value: "a", text: "A" },
      { value: "b", text: "B", group: "G" },
    ]);
    const before = question.toJSON();

    // Act
    openManualEntry(creator, question).setup.apply();

    // Assert
    expect(question.toJSON()).toEqual(before);
    expect(typeof (question.choices[0] as ItemValue).randomize).toBe("boolean");
  });

  it("keeps a pinned choice pinned", () => {
    // Arrange
    const { creator, question } = selectRadiogroup(["a", "b"], "random");
    const cell = choicesTable(creator).visibleRows[0].getQuestionByName("randomize");
    cell.value = false;

    // Act
    openManualEntry(creator, question).setup.apply();

    // Assert - survey-core pins on `=== false`, so a string would unpin it
    expect((question.choices[0] as ItemValue).randomize).toBe(false);
  });

  it("parses the typed field as a boolean and leaves older lines alone", () => {
    // Arrange - the format is value|text|group|randomize, and a line written
    // before randomize existed has to keep meaning what it did
    const { creator, question } = selectRadiogroup(["a", "b"], "random");
    const { setup, text } = openManualEntry(creator, question);

    // Act
    text.value = "a|A|G|false\nb|B|G";
    setup.apply();

    // Assert
    const [pinned, untouched] = question.choices as ItemValue[];
    expect(pinned.randomize).toBe(false);
    expect(untouched.randomize).toBe(true);
    expect(question.toJSON()).toEqual({
      name: "q1",
      choicesOrder: "random",
      choices: [
        { value: "a", text: "A", group: "G", randomize: false },
        { value: "b", text: "B", group: "G" },
      ],
    });
  });

  it("keeps group ahead of randomize so existing lines still parse", () => {
    // Arrange - Manual Entry is positional and group shipped as the third
    // field, so randomize has to sit behind it
    const { creator } = selectRadiogroup(["a", "b"], "random");

    // Act
    const names = choicesTable(creator).columns.map((column) => column.name);

    // Assert
    expect(names.indexOf("group")).toBeLessThan(names.indexOf("randomize"));
  });
});
