import { describe, expect, it } from "vitest";
import type { Submission } from "@/lib/endatix-api";
import type { SurveyModel } from "survey-core";
import { resolveSurveyModelLocaleForSubmission } from "../submission-locale";

describe("resolveSurveyModelLocaleForSubmission", () => {
  const surveyModel = {
    getUsedLocales: () => ["en", "bg"],
  } as unknown as SurveyModel;

  function submissionWithLanguage(language: string): Submission {
    return {
      metadata: JSON.stringify({ language }),
    } as Submission;
  }

  it("returns catalog default when submission language is disabled", () => {
    expect(
      resolveSurveyModelLocaleForSubmission(
        submissionWithLanguage("bg"),
        surveyModel,
        false,
      ),
    ).toBe("");
  });

  it("returns submission SurveyJS locale when enabled and valid", () => {
    expect(
      resolveSurveyModelLocaleForSubmission(
        submissionWithLanguage("bg"),
        surveyModel,
        true,
      ),
    ).toBe("bg");
  });

  it("falls back to catalog default when submission locale is invalid", () => {
    expect(
      resolveSurveyModelLocaleForSubmission(
        submissionWithLanguage("fr"),
        surveyModel,
        true,
      ),
    ).toBe("");
  });
});
