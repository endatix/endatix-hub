import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getCustomQuestionsAction } from "@/features/forms/application/actions/get-custom-questions.action";
import { TelemetryLogger } from "@/features/telemetry";
import type { Submission } from "@/lib/endatix-api";
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
