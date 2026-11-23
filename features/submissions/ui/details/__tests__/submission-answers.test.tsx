import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { DesignerRuntimeProvider } from "@/lib/designer-runtime";
import { SubmissionAnswers } from "../submission-answers";

vi.mock("next/navigation", () => ({
  useRouter: () => null,
  useSearchParams: () => null,
}));
vi.mock("@/features/asset-storage/client", () => ({
  useStorageReadRuntime: () => () => null,
  useStorageView: () => ({ prefetchPrivateReadUrlsForModel: vi.fn() }),
}));
vi.mock("@/lib/survey-extensions/ui/use-survey-extensions", () => ({
  useSurveyExtensions: () => ({ isReady: true }),
}));
vi.mock("../submission-details-context", () => ({
  useSubmissionDetails: () => ({
    submission: { formId: "1", formDefinition: { jsonData: "{" } },
    submissionNavPages: [],
    setSurveyModel: vi.fn(),
  }),
}));

it("replaces the staff loading indicator with an error when survey initialization rejects", async () => {
  // Arrange & Act
  render(
    <DesignerRuntimeProvider initialState={{ formId: "1" }}>
      <SubmissionAnswers customQuestions={[]} />
    </DesignerRuntimeProvider>,
  );

  // Assert
  expect(screen.getByText("Loading...")).toBeTruthy();
  expect(
    await screen.findByText("Error loading submission answers"),
  ).toBeTruthy();
  expect(screen.queryByText("Loading...")).toBeNull();
});
