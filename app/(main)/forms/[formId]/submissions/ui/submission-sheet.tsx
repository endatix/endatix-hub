"use client";

import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { startTransition, useEffect, useState } from "react";
import { Model, Question } from "survey-core";
import { Download, Link as Link2, Trash } from "lucide-react";
import { showComingSoonMessage } from "@/components/layout-ui/teasers/coming-soon-link";
import Link from "next/link";
import { cn, getFormattedDate } from "@/lib/utils";
import AnswerViewer from "@/features/submissions/ui/answers/answer-viewer";
import {
  getDefinitionAction,
  GetDefinitionRequest,
} from "@/features/submissions/use-cases/get-definition/get-definition.action";
import { Submission } from "@/lib/endatix-api";
import { Result } from "@/lib/result";

type SubmissionSheetProps = {
  submission: Submission | null;
};

const SubmissionSheet = ({ submission }: SubmissionSheetProps) => {
  const params = useParams<{ formId: string }>();
  const [surveyModel, setSurveyModel] = useState<Model>();
  const [questions, setQuestions] = useState<Question[]>();

  useEffect(() => {
    const changeSelectedSubmission = async () => {
      startTransition(async () => {
        const getDefinitionRequest: GetDefinitionRequest = {
          formId: params.formId,
          definitionId: submission?.formDefinitionId,
        };
        const getDefinitionResult =
          await getDefinitionAction(getDefinitionRequest);

        if (getDefinitionResult === undefined) {
          return;
        }

        if (Result.isError(getDefinitionResult)) {
          console.error(
            "Failed to get definition",
            getDefinitionResult.message,
          );
          return;
        }

        if (Result.isSuccess(getDefinitionResult) && submission) {
          const json = JSON.parse(getDefinitionResult.value.definitionsData);
          const survey = new Model(json);

          let submissionData = {};
          try {
            submissionData = JSON.parse(submission?.jsonData);
          } catch (ex) {
            console.warn("Error while parsing submission's JSON data", ex);
          }

          survey.data = submissionData;
          setSurveyModel(survey);
          setQuestions(survey.getAllQuestions(true, true, true));
        }
      });
    };

    const fetchDefinition = async () => {
      if (submission) {
        await changeSelectedSubmission();
      }
    };

    fetchDefinition();
  }, [submission, params]);

  return (
    submission &&
    surveyModel && (
      <Sheet modal={false} open={submission != null}>
        <SheetContent className="w-[720px] overflow-auto sm:w-[620px] sm:max-w-none">
          <SheetHeader>
            <SheetTitle>
              {surveyModel?.title} <Link2 className="ml-4 inline-block" />
            </SheetTitle>
          </SheetHeader>
          <div className="my-8 flex space-x-2">
            <Link href="#" onClick={() => showComingSoonMessage()}>
              <Button variant={"outline"}>
                <Download className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </Link>
            <Link href="#" onClick={() => showComingSoonMessage()}>
              <Button variant={"outline"}>
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </Link>
            <Link href="#" onClick={() => showComingSoonMessage()}>
              <Button variant={"outline"}>Mark as spam</Button>
            </Link>
          </div>
          <div className="grid gap-4 py-4">
            {questions?.map((question) => {
              return (
                <div
                  key={question.id}
                  className="grid grid-cols-5 items-center gap-4"
                >
                  <AnswerViewer key={question.id} forQuestion={question} />
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-5 items-center gap-4 py-2">
            <span className="col-span-2 self-start text-right">
              Is Complete
            </span>
            <span className="col-span-3 text-sm text-muted-foreground">
              <span
                className={cn(
                  "mr-1 flex inline-block h-2 w-2 rounded-full",
                  submission.isComplete ? "bg-green-600" : "bg-gray-600",
                )}
              />
              {submission.isComplete ? "Yes" : "No"}
            </span>
          </div>
          {submission.isComplete ? (
            <div className="grid grid-cols-5 items-center gap-4 py-2">
              <span className="col-span-2 self-start text-right">
                Submitted on
              </span>
              <span className="col-span-3 text-sm text-muted-foreground">
                {getFormattedDate(submission.completedAt)}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-5 items-center gap-4 py-2">
              <span className="col-span-2 self-start text-right">
                Last updated on
              </span>
              <span className="col-span-3 text-sm text-muted-foreground">
                {getFormattedDate(submission.createdAt)}
              </span>
            </div>
          )}
          <SheetFooter></SheetFooter>
        </SheetContent>
      </Sheet>
    )
  );
};

export default SubmissionSheet;
