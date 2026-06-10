"use client";

import { toast } from "@/components/ui/toast";
import { editSubmissionByAccessTokenUseCase } from "@/features/public-submissions/edit/edit-submission-by-access-token.use-case";
import type { Submission } from "@/lib/endatix-api";
import { useFormRuntime } from "@/lib/form-runtime/form-runtime.context";
import { useCallback, useEffect } from "react";
import type { Model } from "survey-core";
import { EditSubmissionCore } from "./edit-submission-core";
import { usePublicEditTokenExpiry } from "./use-public-edit-token-expiry";

export interface PublicEditSubmissionProps {
  submission: Submission;
  formId: string;
  token: string;
}

/**
 * Public token-based submission edit — requires {@link FormRuntimeProvider} on the page.
 * Storage reads use the respondent plane with access token.
 */
export function PublicEditSubmission({
  submission,
  formId,
  token,
}: Readonly<PublicEditSubmissionProps>) {
  const formRuntime = useFormRuntime();
  const minutesRemaining = usePublicEditTokenExpiry(token);

  useEffect(() => {
    formRuntime.updateState({
      formId,
      submissionId: submission.id,
      token,
      tokenType: "AccessToken",
    });
  }, [formRuntime, formId, submission.id, token]);

  const customQuestions = submission.formDefinition?.customQuestions;

  const onSave = useCallback(
    async (jsonData: Record<string, unknown>) => {
      try {
        await editSubmissionByAccessTokenUseCase(formId, token, {
          jsonData: JSON.stringify(jsonData),
        });
        toast.success("Changes saved");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message.toLowerCase() : "";

        if (errorMessage.includes("expired")) {
          toast.error(
            "Your access link has expired. Please request a new one.",
          );
        } else {
          console.error(error);
          toast.error("Failed to save changes");
        }
        throw error;
      }
    },
    [formId, token],
  );

  const onDiscard = useCallback(() => {
    // Public discard resets model in core; nothing else required.
  }, []);
  const configureSurveyModel = useCallback((model: Model) => {
    model.widthMode = "responsive";
  }, []);

  return (
    <main className="min-h-screen w-full bg-content-canvas px-4 py-6 sm:px-6 lg:px-8">
      <EditSubmissionCore
        submission={submission}
        customQuestions={customQuestions}
        getRuntimeState={() => formRuntime.stateRef.current}
        patchRuntime={formRuntime.updateState}
        isPublicMode={true}
        minutesRemaining={minutesRemaining}
        configureSurveyModel={configureSurveyModel}
        onSave={onSave}
        onDiscard={onDiscard}
      />
    </main>
  );
}
