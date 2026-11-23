// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { TelemetryLogger } from "@/features/telemetry";
import type { Submission } from "@/lib/endatix-api";
import { useSurveyModel } from "../use-survey-model.hook";

vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: { error: vi.fn() },
}));
vi.mock("../../application/use-search-params-variables.hook", () => {
  const handlers = { processSearchParams: vi.fn(), cleanupUrl: vi.fn() };
  return { useSearchParamsVariables: () => handlers };
});

it("reports an initialization failure without logging definition contents", async () => {
  // Arrange & Act
  const { result } = renderHook(() =>
    useSurveyModel({ formId: "1", definition: "private malformed definition" }),
  );

  // Assert
  await waitFor(() =>
    expect(result.current.error).toBe("Failed to initialize survey"),
  );
  expect(TelemetryLogger.error).toHaveBeenCalledExactlyOnceWith(
    "Failed to initialize survey",
    undefined,
    { failureKind: "syntax" },
  );
});

it("resumes on the saved page with translated controls and restored answers", async () => {
  // Arrange
  const submission: Submission = {
    id: "1",
    formId: "2",
    formDefinitionId: "3",
    createdAt: new Date(),
    isComplete: false,
    status: "draft",
    token: "",
    currentPage: 1,
    jsonData: '{"name":"Ada"}',
    metadata: '{"variables":{"team":"West"}}',
  };
  const definition = JSON.stringify({
    locale: "fr-CA",
    pages: [
      { elements: [{ type: "text", name: "name" }] },
      { elements: [{ type: "text", name: "email" }] },
    ],
  });

  // Act
  const { result } = renderHook(() =>
    useSurveyModel({ formId: submission.formId, definition, submission }),
  );

  // Assert
  await waitFor(() => expect(result.current.surveyModel).not.toBeNull());
  const model = result.current.surveyModel;
  expect(model?.currentPageNo).toBe(1);
  expect(model?.pageNextText).toBe("Suivant");
  expect(model?.data.name).toBe("Ada");
  expect(model?.getVariable("team")).toBe("West");
});
