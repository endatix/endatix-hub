import { beforeEach, describe, expect, it } from "vitest";
import {
  clearSubmissionListReturnTo,
  getSubmissionListReturnPath,
  rememberSubmissionListReturnTo,
} from "../submission-list-return-to";

describe("submission list return-to", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("returns bare list path when nothing is remembered", () => {
    // Arrange & Act & Assert
    expect(getSubmissionListReturnPath("form-1")).toBe(
      "/forms/form-1/submissions",
    );
  });

  it("remembers and restores paging and filters", () => {
    // Arrange
    rememberSubmissionListReturnTo(
      "form-1",
      "page=2&pageSize=40&status=new&isComplete=true",
    );

    // Act
    const path = getSubmissionListReturnPath("form-1");

    // Assert
    expect(path).toContain("/forms/form-1/submissions?");
    expect(path).toContain("page=2");
    expect(path).toContain("pageSize=40");
    expect(path).toContain("status=new");
    expect(path).toContain("isComplete=true");
  });

  it("strips unknown query keys via list parser", () => {
    // Arrange
    rememberSubmissionListReturnTo(
      "form-1",
      "page=2&evil=<script>&pageSize=40",
    );

    // Act
    const path = getSubmissionListReturnPath("form-1");

    // Assert
    expect(path).toBe("/forms/form-1/submissions?page=2&pageSize=40");
    expect(path).not.toContain("evil");
  });

  it("scopes return paths per form id", () => {
    // Arrange
    rememberSubmissionListReturnTo("form-a", "page=3");
    rememberSubmissionListReturnTo("form-b", "page=5");

    // Act & Assert
    expect(getSubmissionListReturnPath("form-a")).toBe(
      "/forms/form-a/submissions?page=3",
    );
    expect(getSubmissionListReturnPath("form-b")).toBe(
      "/forms/form-b/submissions?page=5",
    );
  });

  it("clears remembered return path", () => {
    // Arrange
    rememberSubmissionListReturnTo("form-1", "page=2");

    // Act
    clearSubmissionListReturnTo("form-1");

    // Assert
    expect(getSubmissionListReturnPath("form-1")).toBe(
      "/forms/form-1/submissions",
    );
  });
});
