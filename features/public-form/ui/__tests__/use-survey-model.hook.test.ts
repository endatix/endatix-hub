// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { TelemetryLogger } from "@/features/telemetry";
import { useSurveyModel } from "../use-survey-model.hook";

vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: { error: vi.fn() },
}));
vi.mock("../../application/use-search-params-variables.hook", () => ({
  useSearchParamsVariables: () => ({}),
}));

it("reports an initialization failure without logging definition contents", async () => {
  const { result } = renderHook(() =>
    useSurveyModel({ formId: "1", definition: "private malformed definition" }),
  );

  await waitFor(() =>
    expect(result.current.error).toBe("Failed to initialize survey"),
  );
  expect(TelemetryLogger.error).toHaveBeenCalledExactlyOnceWith(
    "Failed to initialize survey",
    undefined,
    { failureKind: "syntax" },
  );
});
