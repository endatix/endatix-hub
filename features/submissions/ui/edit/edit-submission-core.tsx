"use client";

import "../shared/load-submission-question-registry";
import { Submission } from "@/lib/endatix-api";
import type { ExtensionRuntimeState } from "@/lib/survey-extensions/types";
import { useSurveyExtensions } from "@/lib/survey-extensions/ui/use-survey-extensions";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  DynamicPanelItemValueChangedEvent,
  MatrixCellValueChangedEvent,
  Question,
  SurveyModel,
  ValueChangedEvent,
} from "survey-core";
import EditSubmissionAlertDialog from "./edit-submission-alert-dialog";
import EditSubmissionHeader from "./edit-submission-header";

const SubmissionSurvey = dynamic(() => import("../shared/submission-survey"), {
  ssr: false,
});

export interface EditSubmissionCoreProps {
  submission: Submission;
  customQuestions?: string[];
  getRuntimeState: () => ExtensionRuntimeState;
  patchRuntime: (partial: Partial<ExtensionRuntimeState>) => void;
  isPublicMode: boolean;
  minutesRemaining: number | null;
  onSave: (jsonData: Record<string, unknown>) => Promise<void>;
  onDiscard: () => void;
}

export function EditSubmissionCore({
  submission,
  customQuestions,
  getRuntimeState,
  patchRuntime,
  isPublicMode,
  minutesRemaining,
  onSave,
  onDiscard,
}: Readonly<EditSubmissionCoreProps>) {
  const [submissionData, setSubmissionData] = useState<Record<string, unknown>>(
    () => {
      try {
        return JSON.parse(submission.jsonData);
      } catch {
        return {};
      }
    },
  );
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [changes, setChanges] = useState<Record<string, Question>>({});
  const [surveyModel, setSurveyModel] = useState<SurveyModel | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    patchRuntime({
      formId: submission.formId,
      submissionId: submission.id,
    });
  }, [patchRuntime, submission.formId, submission.id]);

  const onSubmissionChange = useCallback(
    (
      sender: SurveyModel,
      event:
        | ValueChangedEvent
        | DynamicPanelItemValueChangedEvent
        | MatrixCellValueChangedEvent,
    ) => {
      const originalQuestionValue = submissionData[event.question.name];
      const newQuestionValue = event.question?.value;

      if (originalQuestionValue === newQuestionValue) {
        setChanges((prev) => {
          const newChanges = { ...prev };
          delete newChanges[event.question.name];
          return newChanges;
        });
      } else {
        setChanges((prev) => ({
          ...prev,
          [event.question.name]: event.question,
        }));
      }

      setSurveyModel(sender);
    },
    [submissionData],
  );

  const handleSave = useCallback(
    async (event: React.FormEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (!surveyModel?.data || Object.keys(changes).length === 0) {
        return;
      }

      startTransition(async () => {
        try {
          await onSave(surveyModel.data);
          setSaveDialogOpen(false);
          setChanges({});
          setSubmissionData(surveyModel.data);
        } catch {
          // Parent shows toast; keep dialog open for retry.
        }
      });
    },
    [changes, onSave, surveyModel?.data],
  );

  const handleDiscard = useCallback(() => {
    if (isPending) {
      return;
    }

    if (isPublicMode && surveyModel) {
      surveyModel.data = submissionData;
      setChanges({});
    }

    setSaveDialogOpen(false);
    onDiscard();
  }, [isPending, isPublicMode, surveyModel, submissionData, onDiscard]);

  const formDefinitionJson = submission.formDefinition?.jsonData;
  const { isReady, onModelCreated } = useSurveyExtensions({
    formJson: formDefinitionJson,
    runtimeDeps: {
      getRuntimeState,
    },
  });

  if (!isReady) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <EditSubmissionHeader
        submission={submission}
        onSaveClick={() => setSaveDialogOpen(true)}
        onDiscardClick={handleDiscard}
        hasChanges={Object.keys(changes).length > 0}
        isSaving={isPending}
        isPublicMode={isPublicMode}
        minutesRemaining={minutesRemaining}
      />
      <SubmissionSurvey
        submission={submission}
        onChange={onSubmissionChange}
        onModelCreated={onModelCreated}
        customQuestions={customQuestions}
        readOnly={false}
      />
      <EditSubmissionAlertDialog
        submission={submission}
        changes={changes}
        isSaving={isPending}
        open={saveDialogOpen}
        onAction={handleSave}
        onOpenChange={() => {
          if (isPending) {
            return;
          }
          setSaveDialogOpen(!saveDialogOpen);
        }}
      />
    </div>
  );
}
