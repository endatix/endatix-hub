"use client";

import { toast } from "@/components/ui/toast";
import { editSubmissionUseCase } from "@/features/submissions/use-cases/edit-submission.use-case";
import { editSubmissionByTokenUseCase } from "@/features/public-submissions/edit/edit-submission-by-token.use-case";
import { Submission } from "@/lib/endatix-api";
import { ActiveDefinition } from "@/types";
import { Info } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
  DynamicPanelItemValueChangedEvent,
  MatrixCellValueChangedEvent,
  Question,
  SurveyModel,
  ValueChangedEvent,
} from "survey-core";
import EditSubmissionAlertDialog from "./edit-submission-alert-dialog";
import EditSubmissionHeader from "./edit-submission-header";
import { customQuestions } from "@/customizations/questions/question-registry";
import { questionLoaderModule } from "@/lib/questions/question-loader-module";

const EditSurveyWrapper = dynamic(() => import("./edit-survey-wrapper"), {
  ssr: false,
});

// Load all custom questions registered in the question registry
for (const questionName of customQuestions) {
  try {
    await questionLoaderModule.loadQuestion(questionName);
    console.debug(`✅ Loaded custom question: ${questionName}`);
  } catch (error) {
    console.warn(`⚠️ Failed to load custom question: ${questionName}`, error);
  }
}

interface EditSubmissionProps {
  submission: Submission;
  formId?: string; // Optional: for public mode
  token?: string; // Optional: for public mode
}

function EditSubmission({
  submission,
  formId,
  token,
}: Readonly<EditSubmissionProps>) {
  const isPublicMode = token !== undefined;
  const submissionData: Record<string, unknown> = useMemo(() => {
    try {
      return JSON.parse(submission.jsonData);
    } catch {
      return {};
    }
  }, [submission.jsonData]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [changes, setChanges] = useState<Record<string, Question>>({});
  const [surveyModel, setSurveyModel] = useState<SurveyModel | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

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
      if (originalQuestionValue !== newQuestionValue) {
        setChanges((prev) => ({
          ...prev,
          [event.question.name]: event.question,
        }));
      } else {
        setChanges((prev) => {
          const newChanges = { ...prev };
          delete newChanges[event.question.name];
          return newChanges;
        });
      }

      setSurveyModel(sender);
    },
    [submissionData],
  );

  const handleSave = useCallback(
    async (event: React.FormEvent<HTMLButtonElement>) => {
      event.preventDefault();
      if (!surveyModel?.data || Object.keys(changes).length === 0) return;

      try {
        startTransition(async () => {
          if (isPublicMode && formId && token) {
            await editSubmissionByTokenUseCase(formId, token, {
              jsonData: JSON.stringify(surveyModel.data),
            });
            toast.success("Changes saved");
            setSaveDialogOpen(false);
            setChanges({});
          } else {
            await editSubmissionUseCase(submission.formId, submission.id, {
              jsonData: JSON.stringify(surveyModel.data),
            });
            toast.success("Changes saved");
            setSaveDialogOpen(false);
            router.push(
              `/forms/${submission.formId}/submissions/${submission.id}`,
            );
          }
        });
      } catch (error) {
        console.error(error);
        toast.error("Failed to save changes");
      }
    },
    [
      changes,
      isPublicMode,
      formId,
      token,
      router,
      submission.formId,
      submission.id,
      surveyModel?.data,
    ],
  );

  const handleDiscard = useCallback(() => {
    if (isPending) {
      return;
    }

    if (isPublicMode) {
      if (surveyModel) {
        surveyModel.data = submissionData;
      }
      setChanges({});
      setSaveDialogOpen(false);
    } else {
      setSaveDialogOpen(false);
      router.back();
    }
  }, [isPublicMode, surveyModel, submissionData, router, isPending]);

  return (
    <div className="flex flex-col gap-4">
      <EditSubmissionHeader
        submission={submission}
        onSaveClick={() => setSaveDialogOpen(true)}
        onDiscardClick={handleDiscard}
        hasChanges={Object.keys(changes).length > 0}
        isSaving={isPending}
      />
      <EditSurveyWrapper
        submission={submission}
        onChange={onSubmissionChange}
        customQuestions={
          isPublicMode
            ? (submission.formDefinition as ActiveDefinition)?.customQuestions
            : undefined
        }
      />
      <div className="h-8 text-muted-foreground flex flex-row justify-center items-center gap-2">
        <Info className="h-4 w-4" />
        End of submission
      </div>
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

export default EditSubmission;
