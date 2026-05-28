import { afterEach, describe, expect, it, vi } from "vitest";
import { Model, Question } from "survey-core";
import { registerConvertChoicesUiDeps } from "../../conversion/convert-inline-choices-deps";
import { runConvertInlineChoicesToDataList } from "../convert-inline-choices-client";

vi.mock(
  "@/features/data-lists/convert-inline-choices/convert-choices-to-data-list.action",
  () => ({
    convertChoicesToDataListAction: vi.fn(),
  }),
);

describe("runConvertInlineChoicesToDataList", () => {
  afterEach(() => {
    registerConvertChoicesUiDeps(null);
  });

  it("uses question name for the default data list name", async () => {
    // Arrange
    const model = new Model({
      elements: [
        {
          type: "dropdown",
          name: "games",
          title: "Dropdown",
          choices: ["A", "B"],
        },
      ],
    });
    const question = model.getQuestionByName("games") as Question;
    const confirmConvertInlineChoices = vi.fn().mockResolvedValue(null);
    const completeDataListBinding = vi.fn();
    registerConvertChoicesUiDeps({
      getDataListNames: () => [],
      refreshDataLists: vi.fn().mockResolvedValue(undefined),
      completeDataListBinding,
      markFormModified: vi.fn(),
      confirmConvertInlineChoices,
    });

    // Act
    await runConvertInlineChoicesToDataList(question);

    // Assert
    expect(confirmConvertInlineChoices).toHaveBeenCalledWith({
      initialName: "games",
      errorMessage: undefined,
    });
    model.dispose?.();
  });
});
