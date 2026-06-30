import { Model, type QuestionTagboxModel } from "survey-core";
import { beforeEach, describe, expect, it } from "vitest";
import { registerBlindSearchTagboxGlobals } from "../infrastructure/registry";
import {
  applyBlindSearchOtherFallbackAfterLazyLoad,
  bindBlindSearchToSurvey,
  clearBlindSearchRuntimeStateForTests,
} from "../infrastructure/survey-bindings";

const blindTagboxSurveyJson = {
  pages: [
    {
      elements: [
        {
          type: "tagbox",
          name: "countries",
          searchEnabled: true,
          edxHideUntilTyping: true,
          edxMinSearchLength: 2,
          choices: [
            { value: "us", text: "United States" },
            { value: "uk", text: "United Kingdom" },
            { value: "ca", text: "Canada" },
          ],
        },
      ],
    },
  ],
};

function fireChoicesSearch(
  model: Model,
  filter: string,
  questionName = "countries",
) {
  const question = model.getQuestionByName(questionName);
  const options = {
    question,
    filter,
    choices: question!.visibleChoices,
    filteredChoices: undefined as typeof question.visibleChoices | undefined,
  };

  model.onChoicesSearch.fire(model, options);
  return options;
}

describe("bindBlindSearchToSurvey", () => {
  beforeEach(() => {
    registerBlindSearchTagboxGlobals();
    clearBlindSearchRuntimeStateForTests();
  });

  it("suppresses choices below the search threshold", () => {
    // Arrange
    const model = new Model(blindTagboxSurveyJson);
    bindBlindSearchToSurvey(model);

    // Act
    const options = fireChoicesSearch(model, "u");

    // Assert
    expect(options.filteredChoices).toEqual([]);
  });

  it("reveals matching choices at or above the threshold", () => {
    // Arrange
    const model = new Model(blindTagboxSurveyJson);
    bindBlindSearchToSurvey(model);

    // Act
    const options = fireChoicesSearch(model, "un");

    // Assert
    expect(options.filteredChoices?.map((choice) => choice.value)).toEqual([
      "us",
      "uk",
    ]);
  });

  it("hides choices again when the filter drops below threshold", () => {
    // Arrange
    const model = new Model(blindTagboxSurveyJson);
    bindBlindSearchToSurvey(model);
    fireChoicesSearch(model, "un");

    // Act
    const options = fireChoicesSearch(model, "u");

    // Assert
    expect(options.filteredChoices).toEqual([]);
  });

  it("shows Other in the dropdown without enabling the comment area before selection", () => {
    // Arrange
    const model = new Model(blindTagboxSurveyJson);
    const question = model.getQuestionByName(
      "countries",
    ) as QuestionTagboxModel;
    question.showOtherItem = false;
    bindBlindSearchToSurvey(model);
    const dropdown = question.dropdownListModel;
    dropdown.onClick();

    // Act
    fireChoicesSearch(model, "zz");

    // Assert
    expect(question.showOtherItem).toBe(false);
    expect(dropdown.listModel.visibleItems).toHaveLength(1);
    expect(dropdown.listModel.visibleItems[0]?.id).toBe("other");
  });

  it("enables the Other comment area only after Other is selected", () => {
    // Arrange
    const model = new Model(blindTagboxSurveyJson);
    const question = model.getQuestionByName(
      "countries",
    ) as QuestionTagboxModel;
    question.showOtherItem = false;
    bindBlindSearchToSurvey(model);
    fireChoicesSearch(model, "zz");

    // Act
    model.setValue("countries", ["other"]);

    // Assert
    expect(question.showOtherItem).toBe(true);
    expect(question.isOtherSelected).toBe(true);
  });

  it("closes the dropdown when Other is already selected", async () => {
    // Arrange
    const model = new Model(blindTagboxSurveyJson);
    const question = model.getQuestionByName(
      "countries",
    ) as QuestionTagboxModel;
    question.showOtherItem = false;
    bindBlindSearchToSurvey(model);
    model.setValue("countries", ["other"]);
    const dropdown = question.dropdownListModel;

    // Act
    model.onPopupVisibleChanged.fire(model, {
      question,
      popup: dropdown.popupModel,
      visible: true,
    });
    await Promise.resolve();

    // Assert
    expect(dropdown.popupModel.isVisible).toBe(false);
  });

  it("does not force Other for lazy-loaded tagboxes during onChoicesSearch", () => {
    // Arrange
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "tagbox",
              name: "lazy",
              searchEnabled: true,
              choicesLazyLoadEnabled: true,
              edxHideUntilTyping: true,
              edxMinSearchLength: 2,
              choices: [],
            },
          ],
        },
      ],
    });
    const question = model.getQuestionByName("lazy");
    question!.showOtherItem = false;
    bindBlindSearchToSurvey(model);

    // Act
    fireChoicesSearch(model, "zzz", "lazy");

    // Assert
    expect(question!.showOtherItem).toBe(false);
  });

  it("shows Other in the dropdown after lazy load when no items are returned", () => {
    // Arrange
    const model = new Model(blindTagboxSurveyJson);
    const question = model.getQuestionByName(
      "countries",
    ) as QuestionTagboxModel;
    question.showOtherItem = false;

    // Act
    applyBlindSearchOtherFallbackAfterLazyLoad(question, "zzz", 0, true);

    // Assert
    expect(question.showOtherItem).toBe(false);
    expect(question.dropdownListModel.listModel.visibleItems).toHaveLength(1);
    expect(question.dropdownListModel.listModel.visibleItems[0]?.id).toBe(
      "other",
    );
  });

  it("restores forced Other after lazy load when matches are returned", () => {
    // Arrange
    const model = new Model(blindTagboxSurveyJson);
    const question = model.getQuestionByName("countries");
    question!.showOtherItem = false;
    applyBlindSearchOtherFallbackAfterLazyLoad(question!, "zzz", 0, true);

    // Act
    applyBlindSearchOtherFallbackAfterLazyLoad(question!, "ite", 3, true);

    // Assert
    expect(question!.showOtherItem).toBe(false);
  });

  it("does not show Other in the dropdown after a failed lazy load", () => {
    // Arrange
    const model = new Model(blindTagboxSurveyJson);
    const question = model.getQuestionByName(
      "countries",
    ) as QuestionTagboxModel;
    question.showOtherItem = false;
    applyBlindSearchOtherFallbackAfterLazyLoad(question, "zzz", 0, true);
    expect(question.dropdownListModel.listModel.visibleItems).toHaveLength(1);

    // Act
    applyBlindSearchOtherFallbackAfterLazyLoad(question, "zzz", 0, false);

    // Assert
    expect(question.showOtherItem).toBe(false);
  });

  it("does not restore showOtherItem on popup close while Other remains selected", async () => {
    // Arrange
    const model = new Model(blindTagboxSurveyJson);
    const question = model.getQuestionByName(
      "countries",
    ) as QuestionTagboxModel;
    question.showOtherItem = false;
    bindBlindSearchToSurvey(model);
    model.setValue("countries", ["other"]);
    const dropdown = question.dropdownListModel;

    // Act
    model.onPopupVisibleChanged.fire(model, {
      question,
      popup: dropdown.popupModel,
      visible: false,
    });

    // Assert
    expect(question.showOtherItem).toBe(true);
  });

  it("clears choices when the popup closes", async () => {
    // Arrange
    const model = new Model(blindTagboxSurveyJson);
    bindBlindSearchToSurvey(model);
    const question = model.getQuestionByName(
      "countries",
    ) as QuestionTagboxModel;
    const dropdown = question.dropdownListModel;
    dropdown.onClick();
    await Promise.resolve();
    fireChoicesSearch(model, "un");

    // Act
    model.onPopupVisibleChanged.fire(model, {
      question,
      popup: dropdown.popupModel,
      visible: false,
    });

    // Assert
    expect(dropdown.listModel.visibleItems).toHaveLength(0);
  });

  it("restores showOtherItem when the Other tag is removed", () => {
    // Arrange
    const model = new Model(blindTagboxSurveyJson);
    const question = model.getQuestionByName(
      "countries",
    ) as QuestionTagboxModel;
    question.showOtherItem = false;
    bindBlindSearchToSurvey(model);
    fireChoicesSearch(model, "zz");
    model.setValue("countries", ["other"]);

    // Act
    model.setValue("countries", []);

    // Assert
    expect(question.showOtherItem).toBe(false);
  });

  it("restores showOtherItem after cleanup when Other was forced", () => {
    // Arrange
    const model = new Model(blindTagboxSurveyJson);
    const question = model.getQuestionByName("countries");
    question!.showOtherItem = false;
    const cleanup = bindBlindSearchToSurvey(model);
    fireChoicesSearch(model, "zz");

    // Act
    cleanup();

    // Assert
    expect(question!.showOtherItem).toBe(false);
  });

  it("only restores Other state for the survey model being disposed", () => {
    // Arrange
    const previewModel = new Model(blindTagboxSurveyJson);
    const designModel = new Model(blindTagboxSurveyJson);
    const previewQuestion = previewModel.getQuestionByName("countries");
    const designQuestion = designModel.getQuestionByName("countries");
    previewQuestion!.showOtherItem = false;
    designQuestion!.showOtherItem = false;

    const previewCleanup = bindBlindSearchToSurvey(previewModel);
    bindBlindSearchToSurvey(designModel);
    fireChoicesSearch(previewModel, "zz");
    previewModel.setValue("countries", ["other"]);
    fireChoicesSearch(designModel, "zz");
    designModel.setValue("countries", ["other"]);

    // Act
    previewCleanup();

    // Assert
    expect(previewQuestion!.showOtherItem).toBe(false);
    expect(designQuestion!.showOtherItem).toBe(true);
  });

  it("ignores lazy-load fallback for questions detached from a survey", () => {
    // Arrange
    const detachedQuestion = {
      showOtherItem: false,
      survey: undefined,
    } as QuestionTagboxModel;

    // Act & Assert
    expect(() =>
      applyBlindSearchOtherFallbackAfterLazyLoad(detachedQuestion, "zzz", 0, true),
    ).not.toThrow();
    expect(detachedQuestion.showOtherItem).toBe(false);
  });

  it("suppresses choices when the dropdown opens with an empty filter", async () => {
    // Arrange
    const model = new Model(blindTagboxSurveyJson);
    bindBlindSearchToSurvey(model);
    const question = model.getQuestionByName(
      "countries",
    ) as QuestionTagboxModel;
    const dropdown = question.dropdownListModel;

    // Act
    dropdown.onClick();
    await Promise.resolve();

    // Assert
    expect(dropdown.listModel.visibleItems).toHaveLength(0);
  });

  it("keeps choices hidden when the filter is cleared while the popup stays open", async () => {
    // Arrange
    const model = new Model(blindTagboxSurveyJson);
    bindBlindSearchToSurvey(model);
    const question = model.getQuestionByName(
      "countries",
    ) as QuestionTagboxModel;
    const dropdown = question.dropdownListModel;
    dropdown.onClick();
    await Promise.resolve();
    fireChoicesSearch(model, "un");

    // Act
    fireChoicesSearch(model, "");

    // Assert
    expect(dropdown.listModel.visibleItems).toHaveLength(0);
  });

  it("filters carry-forward style inline pools the same as static choices", () => {
    // Arrange
    const model = new Model({
      pages: [
        {
          elements: [
            {
              type: "tagbox",
              name: "carried",
              searchEnabled: true,
              edxHideUntilTyping: true,
              edxMinSearchLength: 1,
              choices: [
                { value: "a1", text: "Answer One" },
                { value: "a2", text: "Answer Two" },
              ],
            },
          ],
        },
      ],
    });
    bindBlindSearchToSurvey(model);

    // Act
    const options = fireChoicesSearch(model, "two", "carried");

    // Assert
    expect(options.filteredChoices?.map((choice) => choice.value)).toEqual([
      "a2",
    ]);
  });
});
