"use client";

import { AssetStorageClientProvider } from "@/features/asset-storage/client";
import type { EmbedFormInfo } from "@/features/embed-form/types";
import type { SubmissionGatePhase } from "@/features/public-form/domain/submission-gate";
import type { PublicSurveyRuntimeProps } from "@/features/public-form/types";
import {
  FormRuntimeProvider,
  useFormRuntime,
} from "@/lib/form-runtime/form-runtime.context";
import { useSurveyExtensions } from "@/lib/survey-extensions/ui/use-survey-extensions";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import type { SubmissionOperation } from "../application/submit-form-operation";
import AlreadyResponded from "./already-responded";
import SubmissionAlreadyCompleted from "./submission-already-completed";

const SurveyComponent = dynamic(() => import("./survey-component"), {
  ssr: false,
});

type RuntimePhase = SubmissionGatePhase | "completed";

export type SurveyJsWrapperProps = {
  extensionIdsToLoad?: string[];
  survey: PublicSurveyRuntimeProps;
};

type SurveyJsWrapperInnerProps = SurveyJsWrapperProps & {
  onSubmitSuccess: (result: SubmissionOperation) => void;
};

const SurveyJsWrapper = (props: SurveyJsWrapperProps) => {
  const { survey } = props;
  const { markCompleted, phase } = useSurveySessionPhase(
    survey.submissionPhase,
  );

  if (phase === "blocked") {
    return (
      <AlreadyResponded
        formId={survey.formId}
        isEmbed={survey.variant === "embed"}
        metadata={survey.activeDefinition.metadata}
      />
    );
  }

  if (shouldShowSubmissionCompleted(survey, phase)) {
    return <SubmissionAlreadyCompleted isEmbed={survey.variant === "embed"} />;
  }

  return (
    <FormRuntimeProvider
      initialState={{
        formId: survey.formId,
        submissionId: survey.submission?.id,
        token: survey.urlToken,
        tokenType: survey.urlToken ? "AccessToken" : undefined,
      }}
    >
      <AssetStorageClientProvider config={survey.storageConfig}>
        <SurveyJsWrapperInner {...props} onSubmitSuccess={markCompleted} />
      </AssetStorageClientProvider>
    </FormRuntimeProvider>
  );
};

const SurveyJsWrapperInner = (props: SurveyJsWrapperInnerProps) => {
  const { extensionIdsToLoad, onSubmitSuccess, survey } = props;
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
      isRespondentTestMode={survey.isRespondentTestMode}
      embedForm={embedForm}
      onModelCreated={onModelCreated}
      onSubmitSuccess={onSubmitSuccess}
    />
  );
};

function shouldShowSubmissionCompleted(
  survey: PublicSurveyRuntimeProps,
  phase: RuntimePhase,
): boolean {
  const isShareOrEmbed =
    survey.variant === "share" || survey.variant === "embed";

  if (!isShareOrEmbed) {
    return false;
  }

  if (phase === "completed") {
    return true;
  }

  return Boolean(survey.urlToken && survey.submission?.isComplete);
}

function useSurveySessionPhase(initialPhase: SubmissionGatePhase) {
  const [phase, setPhase] = useState<RuntimePhase>(initialPhase);

  useEffect(() => {
    setPhase((currentPhase) =>
      currentPhase === "completed" ? currentPhase : initialPhase,
    );
  }, [initialPhase]);

  const markCompleted = useCallback((result: SubmissionOperation) => {
    if (result.isComplete) {
      setPhase("completed");
    }
  }, []);

  return { markCompleted, phase };
}

export default SurveyJsWrapper;
