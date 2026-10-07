import { describe, expect, it } from "vitest";
import { SubmitPublicFormRequestSchema } from "../submit-public-form.types";

describe("SubmitPublicFormRequestSchema", () => {
  it("accepts a valid request body", () => {
    const result = SubmitPublicFormRequestSchema.safeParse({
      submissionData: {
        isComplete: true,
        jsonData: "{}",
        currentPage: 0,
      },
      urlToken: "token-1",
    });

    expect(result.success).toBe(true);
  });

  it("rejects missing submissionData", () => {
    const result = SubmitPublicFormRequestSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejects non-object submissionData", () => {
    const result = SubmitPublicFormRequestSchema.safeParse({
      submissionData: [],
    });

    expect(result.success).toBe(false);
  });

  it("keeps a screen-out outcome", () => {
    // Arrange
    const body = {
      submissionData: {
        isComplete: false,
        jsonData: "{}",
        collectionOutcome: "screen_out",
      },
    };

    // Act
    const result = SubmitPublicFormRequestSchema.safeParse(body);

    // Assert
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.submissionData.collectionOutcome).toBe("screen_out");
    }
  });

  it("rejects any other collection outcome", () => {
    // Arrange
    const body = {
      submissionData: {
        jsonData: "{}",
        collectionOutcome: "complete",
      },
    };

    // Act
    const result = SubmitPublicFormRequestSchema.safeParse(body);

    // Assert
    expect(result.success).toBe(false);
  });

  it("rejects non-string urlToken", () => {
    const result = SubmitPublicFormRequestSchema.safeParse({
      submissionData: { jsonData: "{}" },
      urlToken: 123,
    });

    expect(result.success).toBe(false);
  });
});
