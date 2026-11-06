// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getCustomQuestionsAction } from "@/features/forms/application/actions/get-custom-questions.action";
import { TelemetryLogger } from "@/features/telemetry";
import type { Submission } from "@/lib/endatix-api";
import { Model } from "survey-core";
import { useSurveyModel } from "../use-survey-model.hook";

vi.mock(
  "@/features/forms/application/actions/get-custom-questions.action",
  () => ({ getCustomQuestionsAction: vi.fn() }),
);

vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: { error: vi.fn() },
}));

vi.mock("@/components/ui/toast", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@/lib/themes/use-endatix-themes", () => ({
  useEndatixSurveyTheme: () => ({}),
}));

const submission = {
  id: "1",
  jsonData: "{}",
  formDefinition: { jsonData: '{"elements":[]}' },
} as unknown as Submission;

describe("useSurveyModel", () => {
  it("stops loading and logs when custom questions fail to load", async () => {
    const failure = new Error("fetch failed");
    vi.mocked(getCustomQuestionsAction).mockRejectedValueOnce(failure);

    const { result } = renderHook(() => useSurveyModel(submission));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.model).toBeNull();
    expect(TelemetryLogger.error).toHaveBeenCalledWith(
      "Error initializing survey model",
      failure,
    );
  });
});

describe("useSurveyModel locale", () => {
  const withDefinition = (definition: object, language: string): Submission =>
    ({
      id: "2",
      jsonData: "{}",
      metadata: JSON.stringify({ language }),
      formDefinition: { jsonData: JSON.stringify(definition) },
    }) as unknown as Submission;
  const yesLabel = (model: unknown) =>
    (
      (model as Model).getQuestionByName("agree") as unknown as {
        locLabelTrue: { text: string };
      }
    ).locLabelTrue.text;

  it.each(["", "de", "default"])(
    "shows a single-language survey in its own locale (stored language %j)",
    async (language) => {
      // Arrange & Act
      const { result } = renderHook(() =>
        useSurveyModel(
          withDefinition(
            {
              locale: "de",
              pages: [{ elements: [{ type: "boolean", name: "agree" }] }],
            },
            language,
          ),
          [],
        ),
      );

      // Assert
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.model?.locale).toBe("de");
      expect(yesLabel(result.current.model)).toBe("Ja");
    },
  );

  it("keeps a multi-language survey on today's default", async () => {
    // Arrange & Act
    const { result } = renderHook(() =>
      useSurveyModel(
        withDefinition(
          {
            locale: "de",
            pages: [
              {
                elements: [
                  {
                    type: "boolean",
                    name: "agree",
                    title: { default: "Zustimmen", fr: "D'accord" },
                  },
                ],
              },
            ],
          },
          "default",
        ),
        [],
      ),
    );

    // Assert
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.model?.locale).toBe("");
    expect(yesLabel(result.current.model)).toBe("Yes");
  });
});
