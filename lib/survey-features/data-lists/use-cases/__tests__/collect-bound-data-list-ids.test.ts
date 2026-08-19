import { describe, expect, it } from "vitest";
import { DATA_LIST_PROPERTY_NAME } from "../../constants";
import { collectBoundDataListIdsFromQuestions } from "../collect-bound-data-list-ids";
import type { Question } from "survey-core";

function fakeQuestion(
  type: string,
  dataListId: unknown,
): Question {
  return {
    getType: () => type,
    getPropertyValue: (name: string) =>
      name === DATA_LIST_PROPERTY_NAME ? dataListId : undefined,
  } as Question;
}

describe("collectBoundDataListIdsFromQuestions", () => {
  it("returns unique bound dropdown and tagbox list ids", () => {
    // Arrange
    const questions = [
      fakeQuestion("dropdown", "12"),
      fakeQuestion("tagbox", 12),
      fakeQuestion("dropdown", "99"),
      fakeQuestion("text", "12"),
    ];

    // Act
    const ids = collectBoundDataListIdsFromQuestions(questions);

    // Assert
    expect(ids).toEqual(["12", "99"]);
  });
});
