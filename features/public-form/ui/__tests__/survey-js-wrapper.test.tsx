import type { SubmissionOperation } from "@/features/public-form/application/submit-form-operation";
import type { SurveyJsWrapperProps } from "@/features/public-form/ui/survey-js-wrapper";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SurveyJsWrapper from "../survey-js-wrapper";

vi.mock("@/features/asset-storage/client", () => ({
  AssetStorageClientProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="asset-storage-client-provider">{children}</div>
  ),
}));

vi.mock("@/lib/survey-extensions/ui/use-survey-extensions", () => ({
  useSurveyExtensions: vi.fn(() => ({
    isReady: true,
    onModelCreated: vi.fn(),
  })),
}));

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockSurveyComponent({
      isRespondentTestMode,
      onSubmitSuccess,
    }: {
      isRespondentTestMode?: boolean;
      onSubmitSuccess?: (result: SubmissionOperation) => void;
    }) {
      return (
        <>
          {isRespondentTestMode ? (
            <div data-testid="respondent-test-mode-badge">Test response - not counted</div>
          ) : null}
          <button
            data-testid="survey-component"
            onClick={() =>
              onSubmitSuccess?.({
                submissionId: "submission-1",
                isComplete: true,
              })
            }
            type="button"
          >
            Complete
          </button>
        </>
      );
    },
}));

const defaultProps: SurveyJsWrapperProps = {
  survey: {
    activeDefinition: {
      id: "definition-1",
      isActive: true,
      isDraft: false,
      createdAt: new Date(),
      formId: "form-1",
      jsonData: "{}",
      modifiedAt: new Date(),
    },
    formId: "form-1",
    submissionPhase: "active",
    isRespondentTestMode: false,
    storageConfig: null,
    variant: "share",
  },
};

describe("SurveyJsWrapper", () => {
  it("renders already responded when initial phase is blocked", () => {
    render(
      <SurveyJsWrapper
        {...defaultProps}
        survey={{ ...defaultProps.survey, submissionPhase: "blocked" }}
      />,
    );

    expect(screen.getByText("Already Responded")).toBeDefined();
    expect(screen.queryByTestId("asset-storage-client-provider")).toBeNull();
    expect(screen.queryByTestId("survey-component")).toBeNull();
    expect(screen.queryByTestId("respondent-test-mode-badge")).toBeNull();
  });

  it("renders test mode badge for test respondents", () => {
    render(
      <SurveyJsWrapper
        {...defaultProps}
        survey={{ ...defaultProps.survey, isRespondentTestMode: true }}
      />,
    );

    expect(screen.getByTestId("respondent-test-mode-badge")).toBeDefined();
    expect(screen.getByText("Test response - not counted")).toBeDefined();
  });

  it("keeps completed sessions on survey when server props later become blocked", () => {
    const { rerender } = render(<SurveyJsWrapper {...defaultProps} />);

    fireEvent.click(screen.getByTestId("survey-component"));
    rerender(
      <SurveyJsWrapper
        {...defaultProps}
        survey={{ ...defaultProps.survey, submissionPhase: "blocked" }}
      />,
    );

    expect(screen.getByTestId("survey-component")).toBeDefined();
    expect(screen.queryByText("Already Responded")).toBeNull();
  });
});
