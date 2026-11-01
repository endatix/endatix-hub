import { toTestInspectorView } from "@/features/public-form/inspect-test-submission/test-inspector-view";
import type { SurveyJsWrapperProps } from "@/features/public-form/ui/survey-js-wrapper";
import type { Submission } from "@/lib/endatix-api";
import { PersonalizationSource } from "@/lib/endatix-api/submissions/types";
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock(
  "@/features/public-form/application/actions/start-new-response.action",
  () => ({ startNewResponseAction: vi.fn() }),
);

vi.mock(
  "@/features/public-form/application/actions/restart-test-submission.action",
  () => ({ restartTestSubmissionAction: vi.fn() }),
);

vi.mock(
  "@/features/public-form/inspect-test-submission/ui/lazy-test-inspector",
  () => ({
    TestInspector: ({ model }: { model: unknown }) => (
      <div
        data-has-model={String(model !== null)}
        data-testid="test-inspector"
      />
    ),
  }),
);

vi.mock("next/dynamic", () => ({
  default: () =>
    function MockSurveyComponent({
      testSubmission,
    }: {
      testSubmission?: {
        renderCorner: (model: unknown) => React.ReactNode;
        writeToken?: string;
      };
    }) {
      return (
        <>
          {testSubmission?.renderCorner({})}
          <button
            data-testid="survey-component"
            data-write-token={testSubmission?.writeToken}
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
    submissionPhase: "resume",
    isRespondentTestMode: false,
    storageConfig: null,
    testInspector: null,
    variant: "share",
  },
};

/** What the server sends a viewer with forms.test. */
function testerView(submission: Submission, canStartOver = true) {
  return toTestInspectorView({ formId: "form-1", submission, canStartOver });
}

function testSubmission(isComplete: boolean): Submission {
  return {
    id: "submission-21",
    formId: "form-1",
    formDefinitionId: "definition-1",
    isComplete,
    isTestSubmission: true,
    jsonData: "{}",
    currentPage: 0,
    metadata: "{}",
    token: "submission-token",
    createdAt: new Date(),
    modifiedAt: new Date(),
    status: isComplete ? "completed" : "draft",
    personalization: {
      identifier: "tester@example.com",
      capturedAt: "2026-10-19T00:00:00Z",
      variables: {},
      source: PersonalizationSource.Test,
    },
  };
}

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

  it("renders the closed status for a closed submission", () => {
    // Arrange
    const survey = {
      ...defaultProps.survey,
      submissionPhase: "closed" as const,
    };

    // Act
    render(<SurveyJsWrapper {...defaultProps} survey={survey} />);

    // Assert
    expect(screen.getByText("Response recorded")).toBeDefined();
    expect(
      screen.getByText("This response is closed and cannot be continued."),
    ).toBeDefined();
    expect(screen.queryByText("Start a new response")).toBeNull();
  });

  it.each([["closed"], ["completed"]] as const)(
    "offers a new response on a %s cookie submission when the form allows it",
    (submissionPhase) => {
      // Arrange
      const survey = {
        ...defaultProps.survey,
        submissionPhase,
        canStartOver: true,
      };

      // Act
      render(<SurveyJsWrapper {...defaultProps} survey={survey} />);

      // Assert
      expect(screen.getByText("Start a new response")).toBeDefined();
    },
  );

  it("renders submission already completed when the gate phase is completed", () => {
    render(
      <SurveyJsWrapper
        {...defaultProps}
        survey={{
          ...defaultProps.survey,
          submissionPhase: "completed",
          urlToken: "access-token",
          submission: {
            id: "submission-1",
            formId: "form-1",
            formDefinitionId: "definition-1",
            isComplete: true,
            jsonData: "{}",
            currentPage: 0,
            metadata: "{}",
            token: "submission-token",
            createdAt: new Date(),
            modifiedAt: new Date(),
            status: "completed",
          },
        }}
      />,
    );

    expect(screen.getByText("Thank you")).toBeDefined();
    expect(
      screen.getByText("This form has already been completed."),
    ).toBeDefined();
    expect(screen.queryByTestId("survey-component")).toBeNull();
  });

  it("renders test mode badge for test respondents", () => {
    render(
      <SurveyJsWrapper
        {...defaultProps}
        survey={{ ...defaultProps.survey, isRespondentTestMode: true }}
      />,
    );

    expect(screen.getByTestId("respondent-test-mode-badge")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
  });

  it("gives a tester the Test inspector beside the survey, in place of the notice", () => {
    render(
      <SurveyJsWrapper
        {...defaultProps}
        survey={{
          ...defaultProps.survey,
          submission: testSubmission(false),
          testInspector: testerView(testSubmission(false)),
        }}
      />,
    );

    expect(
      screen.getByTestId("test-inspector").getAttribute("data-has-model"),
    ).toBe("true");
    expect(screen.queryByTestId("respondent-test-mode-badge")).toBeNull();
  });

  it("keeps the notice plus Start over for a tester in an embed", () => {
    render(
      <SurveyJsWrapper
        {...defaultProps}
        survey={{
          ...defaultProps.survey,
          variant: "embed",
          submission: testSubmission(false),
          testInspector: testerView(testSubmission(false)),
        }}
      />,
    );

    expect(screen.queryByTestId("test-inspector")).toBeNull();
    expect(screen.getByTestId("respondent-test-mode-badge")).toBeDefined();
    expect(screen.getByRole("button", { name: "Start over" })).toBeDefined();
  });

  it("shows nothing test-related to a real respondent", () => {
    render(<SurveyJsWrapper {...defaultProps} />);

    expect(screen.queryByTestId("test-inspector")).toBeNull();
    expect(screen.queryByTestId("respondent-test-mode-badge")).toBeNull();
  });

  it("saves a person's test submission with its own token, so another tab's cookie swap cannot redirect it", () => {
    render(
      <SurveyJsWrapper
        {...defaultProps}
        survey={{ ...defaultProps.survey, submission: testSubmission(false) }}
      />,
    );

    expect(
      screen.getByTestId("survey-component").getAttribute("data-write-token"),
    ).toBe("submission-token");
  });

  it("replaces the cookie Start a new response with the Test inspector on a finished test submission", () => {
    render(
      <SurveyJsWrapper
        {...defaultProps}
        survey={{
          ...defaultProps.survey,
          submissionPhase: "completed",
          canStartOver: true,
          isRespondentTestMode: true,
          submission: testSubmission(true),
          testInspector: testerView(testSubmission(true)),
        }}
      />,
    );

    expect(
      screen.getByTestId("test-inspector").getAttribute("data-has-model"),
    ).toBe("false");
    expect(screen.queryByText("Start a new response")).toBeNull();
  });

  it("hides the cookie Start a new response on a person's test submission even without forms.test", () => {
    render(
      <SurveyJsWrapper
        {...defaultProps}
        survey={{
          ...defaultProps.survey,
          submissionPhase: "completed",
          canStartOver: true,
          submission: testSubmission(true),
        }}
      />,
    );

    expect(screen.queryByText("Start a new response")).toBeNull();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
  });

  it("shows only the notice to any other viewer of a test submission", () => {
    render(
      <SurveyJsWrapper
        {...defaultProps}
        survey={{
          ...defaultProps.survey,
          submissionPhase: "completed",
          submission: testSubmission(true),
        }}
      />,
    );

    expect(screen.getByTestId("respondent-test-mode-badge")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Start over" })).toBeNull();
  });

  it("keeps the survey visible after client-side submit so SurveyJS can show its thank-you page", () => {
    render(<SurveyJsWrapper {...defaultProps} />);

    fireEvent.click(screen.getByTestId("survey-component"));

    expect(screen.getByTestId("survey-component")).toBeDefined();
    expect(
      screen.queryByText("This form has already been completed."),
    ).toBeNull();
    expect(screen.queryByText("Already Responded")).toBeNull();
  });

  it("shows already responded when server props become blocked after navigation", () => {
    render(
      <SurveyJsWrapper
        {...defaultProps}
        survey={{ ...defaultProps.survey, submissionPhase: "blocked" }}
      />,
    );

    expect(screen.getByText("Already Responded")).toBeDefined();
    expect(screen.queryByTestId("survey-component")).toBeNull();
  });
});
