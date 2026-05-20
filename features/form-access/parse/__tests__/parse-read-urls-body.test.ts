import { describe, expect, it } from "vitest";
import { Result } from "@/lib/result";
import { parsePublicReadUrlsBody } from "../parse-read-urls-body";

describe("parsePublicReadUrlsBody", () => {
  it("requires formId and urls", () => {
    expect(Result.isError(parsePublicReadUrlsBody({ urls: ["a"] }))).toBe(true);
    expect(Result.isError(parsePublicReadUrlsBody({ formId: "f1" }))).toBe(
      true,
    );
  });

  it("accepts gate fields", () => {
    const result = parsePublicReadUrlsBody({
      formId: "100",
      submissionId: "200",
      token: "abc",
      tokenType: "SubmissionToken",
      urls: ["https://example/file"],
    });
    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isSuccess(result)) {
      expect(result.value.gate.formId).toBe("100");
      expect(result.value.gate.submissionId).toBe("200");
      expect(result.value.urls).toHaveLength(1);
    }
  });

  it("rejects non-numeric formId", () => {
    expect(
      Result.isError(
        parsePublicReadUrlsBody({ formId: "form-1", urls: ["a"] }),
      ),
    ).toBe(true);
  });
});
