import { describe, expect, it, vi } from "vitest";
import { Model, Question } from "survey-core";
import type { SurveyCreatorModel } from "survey-creator-core";
import { DATA_LIST_PROPERTY_NAME } from "../../constants";
import { syncDataListPropertyGridAfterBinding } from "../creator-property-grid-sync";

describe("syncDataListPropertyGridAfterBinding", () => {
  it("refreshes the property grid when the question is selected", () => {
    // Arrange
    const model = new Model({
      elements: [{ type: "dropdown", name: "games", choices: ["A"] }],
    });
    const question = model.getQuestionByName("games") as Question;
    const refresh = vi.fn();
    const selectElement = vi.fn();
    const creator = {
      selectedElement: question,
      designerPropertyGrid: { refresh },
      selectElement,
    } as unknown as SurveyCreatorModel;

    // Act
    syncDataListPropertyGridAfterBinding(creator, question);

    // Assert
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(selectElement).toHaveBeenCalledWith(
      question,
      DATA_LIST_PROPERTY_NAME,
      false,
    );
    model.dispose?.();
  });

  it("does nothing when another element is selected", () => {
    // Arrange
    const model = new Model({
      elements: [
        { type: "dropdown", name: "games", choices: ["A"] },
        { type: "dropdown", name: "other", choices: ["B"] },
      ],
    });
    const question = model.getQuestionByName("games") as Question;
    const other = model.getQuestionByName("other") as Question;
    const refresh = vi.fn();
    const creator = {
      selectedElement: other,
      designerPropertyGrid: { refresh },
      selectElement: vi.fn(),
    } as unknown as SurveyCreatorModel;

    // Act
    syncDataListPropertyGridAfterBinding(creator, question);

    // Assert
    expect(refresh).not.toHaveBeenCalled();
    model.dispose?.();
  });
});
