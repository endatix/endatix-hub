"use client";

import { AssetStorageClientProvider } from "@/features/asset-storage/client";
import type { EmbedFormInfo } from "@/features/embed-form/types";
import type { PublicSurveyRuntimeProps } from "@/features/public-form/types";
import {
  StartOver,
  startOverTarget,
  TestInspector,
} from "@/features/public-form/inspect-test-submission";
import {
  isPersonTestSubmission,
  testCornerFor,
  testWriteToken,
} from "@/features/public-form/test-submission-mode";
import {
  FormRuntimeProvider,
  useFormRuntime,
} from "@/lib/form-runtime/form-runtime.context";
import { useSurveyExtensions } from "@/lib/survey-extensions/ui/use-survey-extensions";
import dynamic from "next/dynamic";
import type { SurveyModel } from "survey-core";
import AlreadyResponded from "./already-responded";
import SubmissionAlreadyCompleted from "./submission-already-completed";
import { StartNewResponseButton } from "./start-new-response-button";
import SubmissionClosed from "./submission-closed";
import type { RenderTestCorner, TestSubmissionView } from "./survey-component";
import { TestSubmissionNotice } from "./test-submission-notice";

const SurveyComponent = dynamic(() => import("./survey-component"), {
  ssr: false,
});

export type SurveyJsWrapperProps = {
  extensionIdsToLoad?: string[];
  survey: PublicSurveyRuntimeProps;
};

/**
 * The page's test corner. A tester gets the Test inspector, except in embeds, which keep the
 * notice plus Start over. Every other viewer of a test page gets the notice; a real respondent nothing.
 */
function testCornerRenderer(
  survey: PublicSurveyRuntimeProps,
): RenderTestCorner {
  const corner = testCornerFor(survey);
  const view = survey.testInspector;
  if (corner === "none") return () => null;
  if (corner === "inspector" && view && survey.variant !== "embed") {
    return function renderInspector(model: SurveyModel | null) {
      return <TestInspector model={model} view={view} />;
    };
  }
  const startOver = startOverTarget(view);
  return function renderNotice() {
    return (
      <TestSubmissionNotice>
        {startOver ? <StartOver startOver={startOver} /> : null}
      </TestSubmissionNotice>
    );
  };
}

/**
 * The test corner, and which Start over the page offers. A person's test submission never offers
 * the cookie one, which would only forget the token; a viewer with `forms.test` gets the corner's.
 */
function testControls(survey: PublicSurveyRuntimeProps) {
  const cookieStartOver =
    survey.canStartOver && !isPersonTestSubmission(survey.submission) ? (
      <StartNewResponseButton formId={survey.formId} />
    ) : null;
  return {
    renderCorner: testCornerRenderer(survey),
    cookieStartOver,
    testSubmissionKey: startOverTarget(survey.testInspector)?.submissionId,
    writeToken: testWriteToken(survey),
  };
}

type TestControls = ReturnType<typeof testControls>;

/** A completed or closed submission: its status page, with the test corner when it applies. */
function FinishedSubmission({
  survey,
  controls,
}: Readonly<{ survey: PublicSurveyRuntimeProps; controls: TestControls }>) {
  const StatusPage =
    survey.submissionPhase === "completed"
      ? SubmissionAlreadyCompleted
      : SubmissionClosed;
  return (
    <>
      {controls.renderCorner(null)}
      <StatusPage variant={survey.variant}>
        {controls.cookieStartOver}
      </StatusPage>
    </>
  );
}

type InnerProps = SurveyJsWrapperProps & {
  testSubmission: TestSubmissionView;
};

const SurveyJsWrapper = (props: SurveyJsWrapperProps) => {
  const { survey } = props;

  if (survey.submissionPhase === "blocked") {
    return (
      <AlreadyResponded
        formId={survey.formId}
        metadata={survey.activeDefinition.metadata}
        variant={survey.variant}
      />
    );
  }

  const controls = testControls(survey);
  if (
    survey.submissionPhase === "completed" ||
    survey.submissionPhase === "closed"
  ) {
    return <FinishedSubmission survey={survey} controls={controls} />;
  }

  // Start over loads a new submission into the same page: remount so the survey starts empty.
  return (
    <FormRuntimeProvider
      key={controls.testSubmissionKey}
      initialState={{
        formId: survey.formId,
        submissionId: survey.submission?.id,
        token: survey.urlToken,
        tokenType: survey.urlToken ? "AccessToken" : undefined,
      }}
    >
      <AssetStorageClientProvider config={survey.storageConfig}>
        <SurveyJsWrapperInner
          {...props}
          testSubmission={{
            renderCorner: controls.renderCorner,
            writeToken: controls.writeToken,
          }}
        />
      </AssetStorageClientProvider>
    </FormRuntimeProvider>
  );
};

const SurveyJsWrapperInner = (props: InnerProps) => {
  const { extensionIdsToLoad, survey, testSubmission } = props;
  const { activeDefinition } = survey;

  const formRuntime = useFormRuntime();
  const { isReady, onModelCreated } = useSurveyExtensions({
    formJson: activeDefinition.jsonData,
    extensionIdsToLoad,
    runtimeDeps: {
      getRuntimeState: () => formRuntime.stateRef.current,
    },
  });

  if (!isReady) {
    return <div>Loading...</div>;
  }

  const embedForm: EmbedFormInfo | undefined =
    survey.variant === "embed"
      ? {
          formId: survey.formId,
          definitionId: activeDefinition.id,
          limitOnePerUser: activeDefinition.limitOnePerUser ?? false,
          requiresReCaptcha: activeDefinition.requiresReCaptcha ?? false,
          metadata: activeDefinition.metadata,
        }
      : undefined;

  return (
    <SurveyComponent
      formId={survey.formId}
      definition={activeDefinition.jsonData}
      submission={survey.submission}
      theme={activeDefinition.themeModel}
      customQuestions={activeDefinition.customQuestions}
      requiresReCaptcha={activeDefinition.requiresReCaptcha}
      isEmbed={survey.variant === "embed"}
      testSubmission={testSubmission}
      embedForm={embedForm}
      onModelCreated={onModelCreated}
    />
  );
};

export default SurveyJsWrapper;
