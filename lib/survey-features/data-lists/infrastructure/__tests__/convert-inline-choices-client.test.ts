import { afterEach, describe, expect, it, vi } from "vitest";
import { Model, Question } from "survey-core";
import { Result } from "@/lib/result";
import { convertChoicesToDataListAction } from "@/features/data-lists/convert-inline-choices/convert-choices-to-data-list.action";
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
    vi.clearAllMocks();
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
      searchDataListNames: vi.fn().mockResolvedValue([]),
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

  it("reopens the dialog when the API returns duplicate name error code", async () => {
    // Arrange
    const model = new Model({
      elements: [
        {
          type: "dropdown",
          name: "games",
          choices: ["A", "B"],
        },
      ],
    });
    const question = model.getQuestionByName("games") as Question;
    const confirmConvertInlineChoices = vi
      .fn()
      .mockResolvedValueOnce("Games")
      .mockResolvedValueOnce(null);
    const refreshDataLists = vi.fn().mockResolvedValue(undefined);
    vi.mocked(convertChoicesToDataListAction).mockResolvedValue(
      Result.validationError(
        "A data list with the name 'Games' already exists.",
        undefined,
        "data_list_name_already_exists",
      ),
    );
    registerConvertChoicesUiDeps({
      searchDataListNames: vi.fn().mockResolvedValue([]),
      refreshDataLists,
      completeDataListBinding: vi.fn(),
      markFormModified: vi.fn(),
      confirmConvertInlineChoices,
    });

    // Act
    await runConvertInlineChoicesToDataList(question);

    // Assert
    expect(refreshDataLists).toHaveBeenCalledTimes(1);
    expect(confirmConvertInlineChoices).toHaveBeenLastCalledWith({
      initialName: "Games",
      errorMessage: "A data list with the name 'Games' already exists.",
    });
    model.dispose?.();
  });
});
