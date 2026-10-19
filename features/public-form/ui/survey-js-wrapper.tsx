"use client";

import { AssetStorageClientProvider } from "@/features/asset-storage/client";
import type { EmbedFormInfo } from "@/features/embed-form/types";
import type { PublicSurveyRuntimeProps } from "@/features/public-form/types";
import {
  isPersonTestSubmission,
  testSubmissionMode,
} from "@/features/public-form/test-submission-mode";
import {
  FormRuntimeProvider,
  useFormRuntime,
} from "@/lib/form-runtime/form-runtime.context";
import { useSurveyExtensions } from "@/lib/survey-extensions/ui/use-survey-extensions";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import AlreadyResponded from "./already-responded";
import SubmissionAlreadyCompleted from "./submission-already-completed";
import { StartNewResponseButton } from "./start-new-response-button";
import SubmissionClosed from "./submission-closed";
import { TestSubmissionBadge } from "./test-submission-badge";

const SurveyComponent = dynamic(() => import("./survey-component"), {
  ssr: false,
});

export type SurveyJsWrapperProps = {
  extensionIdsToLoad?: string[];
  survey: PublicSurveyRuntimeProps;
};

/**
 * The test badge, and which Start over the page offers. A person's test submission never offers
 * the cookie one, which would only forget the token; a viewer with `forms.test` gets the badge's.
 */
function testControls(survey: PublicSurveyRuntimeProps) {
  const mode = testSubmissionMode(survey);
  const submissionId = mode.startOverSubmissionId;
  const startOver = submissionId
    ? { formId: survey.formId, submissionId }
    : undefined;
  const badge = mode.showBadge ? (
    <TestSubmissionBadge startOver={startOver} />
  ) : null;
  const cookieStartOver =
    survey.canStartOver && !isPersonTestSubmission(survey.submission) ? (
      <StartNewResponseButton formId={survey.formId} />
    ) : null;
  return {
    badge,
    cookieStartOver,
    testSubmissionKey: submissionId ?? undefined,
  };
}

type TestControls = ReturnType<typeof testControls>;

/** A completed or closed submission: its status page, with the test badge when it applies. */
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
      {controls.badge}
      <StatusPage variant={survey.variant}>
        {controls.cookieStartOver}
      </StatusPage>
    </>
  );
}

type InnerProps = SurveyJsWrapperProps & { testBadge: ReactNode };

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
        <SurveyJsWrapperInner {...props} testBadge={controls.badge} />
      </AssetStorageClientProvider>
    </FormRuntimeProvider>
  );
};

const SurveyJsWrapperInner = (props: InnerProps) => {
  const { extensionIdsToLoad, survey, testBadge } = props;
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
      testBadge={testBadge}
      embedForm={embedForm}
      onModelCreated={onModelCreated}
    />
  );
};

export default SurveyJsWrapper;
