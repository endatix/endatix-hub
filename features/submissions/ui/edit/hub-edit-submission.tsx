"use client";

import { toast } from "@/components/ui/toast";
import { editSubmissionUseCase } from "@/features/submissions/use-cases/edit-submission.use-case";
import { Submission } from "@/lib/endatix-api";
import { useDesignerRuntime } from "@/lib/designer-runtime";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { EditSubmissionCore } from "./edit-submission-core";

export interface HubEditSubmissionProps {
  submission: Submission;
}

/**
 * Hub submission edit — requires {@link DesignerRuntimeProvider} on the page.
 * Storage reads use the designer plane; form-access JWT for data lists uses the
 * public BFF (see h415 plan — server mint deferred).
 */
export function HubEditSubmission({
  submission,
}: Readonly<HubEditSubmissionProps>) {
  const designerRuntime = useDesignerRuntime();
  const router = useRouter();

  const onSave = useCallback(
    async (jsonData: Record<string, unknown>) => {
      try {
        await editSubmissionUseCase(submission.formId, submission.id, {
          jsonData: JSON.stringify(jsonData),
        });
        toast.success("Changes saved");
        router.push(`/forms/${submission.formId}/submissions/${submission.id}`);
      } catch (error) {
        console.error(error);
        toast.error("Failed to save changes");
        throw error;
      }
    },
    [router, submission.formId, submission.id],
  );

  const onDiscard = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <EditSubmissionCore
      submission={submission}
      getRuntimeState={() => designerRuntime.stateRef.current}
      patchRuntime={designerRuntime.updateState}
      isPublicMode={false}
      minutesRemaining={null}
      onSave={onSave}
      onDiscard={onDiscard}
    />
  );
}
