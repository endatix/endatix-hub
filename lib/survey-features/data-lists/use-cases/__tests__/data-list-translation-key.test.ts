import { describe, expect, it } from "vitest";
import {
  encodeDataListTranslationKey,
  parseDataListTranslationKey,
} from "../data-list-translation-key";

describe("data-list translation compound keys", () => {
  it("round-trips list id and values that contain underscores", () => {
    // Arrange
    const key = encodeDataListTranslationKey("42", "new_york_city");

    // Act
    const parsed = parseDataListTranslationKey(key);

    // Assert
    expect(key).toBe("edx_dataList_42_new_york_city");
    expect(parsed).toEqual({ dataListId: "42", value: "new_york_city" });
  });

  it("rejects form translation keys", () => {
    // Arrange & Act
    const parsed = parseDataListTranslationKey("page1.question1.title");

    // Assert
    expect(parsed).toBeNull();
  });
});
