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

  it("rejects non-string urlToken", () => {
    const result = SubmitPublicFormRequestSchema.safeParse({
      submissionData: { jsonData: "{}" },
      urlToken: 123,
    });

    expect(result.success).toBe(false);
  });
});
