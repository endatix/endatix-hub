"use client";

import { toast } from "@/components/ui/toast";
import { customQuestions } from "@/customizations/questions/question-registry";
import { editSubmissionByAccessTokenUseCase } from "@/features/public-submissions/edit/edit-submission-by-access-token.use-case";
import { editSubmissionUseCase } from "@/features/submissions/use-cases/edit-submission.use-case";
import { Submission } from "@/lib/endatix-api";
import { parseTokenExpiry } from "@/lib/utils";
import { questionLoaderModule } from "@/lib/questions/question-loader-module";
import { ActiveDefinition } from "@/types";
import { Info } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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

function EditSubmission({ submission, formId, token }: EditSubmissionProps) {
  const isPublicMode = token !== undefined;
  const [submissionData, setSubmissionData] = useState<Record<string, unknown>>(() => {
    try {
      return JSON.parse(submission.jsonData);
    } catch {
      return {};
    }
  });
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [changes, setChanges] = useState<Record<string, Question>>({});
  const [surveyModel, setSurveyModel] = useState<SurveyModel | null>(null);
  const [isPending, startTransition] = useTransition();
  const [minutesRemaining, setMinutesRemaining] = useState<number | null>(null);
  const shownWarningsRef = useRef<Set<number>>(new Set());
  const router = useRouter();

  // Track token expiry for public mode
  useEffect(() => {
    if (!isPublicMode || !token) return;

    const expiryTime = parseTokenExpiry(token);
    if (!expiryTime) return;

    const updateTimeRemaining = () => {
      const now = Date.now();
      const remaining = expiryTime - now;
      const minutes = Math.floor(remaining / 60000);

      setMinutesRemaining(minutes);

      // Show toast warnings at thresholds
      if (minutes === 30 && !shownWarningsRef.current.has(30)) {
        toast.warning("Your edit access will expire in 30 minutes. Please save your changes soon.");
        shownWarningsRef.current.add(30);
      } else if (minutes === 10 && !shownWarningsRef.current.has(10)) {
        toast.warning("Your edit access will expire in 10 minutes. Save your changes!");
        shownWarningsRef.current.add(10);
      } else if (minutes === 5 && !shownWarningsRef.current.has(5)) {
        toast.error("Your access expires in 5 minutes! Save now or your changes may be lost.");
        shownWarningsRef.current.add(5);
      }
    };

    // Initial check
    updateTimeRemaining();

    // Check every 30 seconds
    const interval = setInterval(updateTimeRemaining, 30000);

    return () => clearInterval(interval);
  }, [isPublicMode, token]);

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

      startTransition(async () => {
        try {
          if (isPublicMode && formId && token) {
            await editSubmissionByAccessTokenUseCase(formId, token, {
              jsonData: JSON.stringify(surveyModel.data),
            });
            toast.success("Changes saved");
            setSaveDialogOpen(false);
            setChanges({});
            setSubmissionData(surveyModel.data);
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
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message.toLowerCase() : "";

          if (errorMessage.includes("expired")) {
            toast.error("Your access link has expired. Please request a new one.");
          } else {
            console.error(error);
            toast.error("Failed to save changes");
          }
        }
      });
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
      setSubmissionData,
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
        isPublicMode={isPublicMode}
        minutesRemaining={minutesRemaining}
      />
      <SubmissionSurvey
        submission={submission}
        onChange={onSubmissionChange}
        customQuestions={
          isPublicMode
            ? (submission.formDefinition as ActiveDefinition)?.customQuestions
            : undefined
        }
        readOnly={false}
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
