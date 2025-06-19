"use client";

import { SectionTitle } from "@/components/headings/section-title";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronsUpDown, UserRoundSearch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Model, Question, QuestionNonValue } from "survey-core";
import AnswerViewer from "../answers/answer-viewer";
import { QuestionLabel } from "./question-label";

export function SubmissionAnswers({
  formDefinition,
  submissionData,
  formId,
}: {
  formDefinition: string;
  submissionData: string;
  formId: string;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [surveyModel, setSurveyModel] = useState<Model | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (!formDefinition || !submissionData) {
        setError("Form definition or submission data is missing");
        return;
      }

      if (!surveyModel) {
        const json = JSON.parse(formDefinition);
        const surveyModelNew = new Model(json);

        // TODO: Add preload external data here

        const parsedData = JSON.parse(submissionData);

        surveyModelNew.data = parsedData;
        const surveyQuestions = surveyModelNew.getAllQuestions(
          false,
          false,
          false,
        );
        setQuestions(surveyQuestions);
        setSurveyModel(surveyModelNew);
      }
    } catch (ex) {
      console.warn("Error while parsing submission's JSON data", ex);
      setError("Error while parsing submission's JSON data");
    }
  }, [formDefinition, formId, submissionData, surveyModel]);

  if (error || !surveyModel) {
    return <ErrorView />;
  }

  return (
    <>
      <SectionTitle title="Submission Answers" headingClassName="py-2 my-0" />
      <div className="grid gap-4">
        <DynamicVariablesView surveyModel={surveyModel} />
        {questions?.map((question) => (
          <SubmissionItemRow key={question.id} question={question} />
        ))}
      </div>
    </>
  );
}

const SubmissionItemRow = ({ question }: { question: Question }) => {
  if (question instanceof QuestionNonValue) {
    return null;
  }

  return (
    <div key={question.id} className="grid grid-cols-5 items-center gap-4 mb-6">
      <QuestionLabel forQuestion={question} />
      <AnswerViewer
        key={question.id}
        forQuestion={question}
        className="col-span-3"
      />
    </div>
  );
};

interface DynamicVariablesViewProps {
  surveyModel: Model;
}

const DynamicVariablesView = ({ surveyModel }: DynamicVariablesViewProps) => {
  const [isOpen, setIsOpen] = useState(true);

  const dynamicVariableNames = useMemo(
    () => surveyModel?.getVariableNames() ?? [],
    [surveyModel],
  );

  const hasVariables = dynamicVariableNames.length > 0;

  if (!hasVariables) {
    return null;
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="grid grid-cols-5 items-start gap-4 mb-6 h-full"
    >
      <div className="text-right col-span-2 flex top-0 justify-end">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <UserRoundSearch /> Dynamic Variables
        </h4>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-9 p-0">
            <ChevronsUpDown className="h-4 w-4" />
            <span className="sr-only">Toggle</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <div className="col-span-3">
        <CollapsibleContent className="space-y-2">
          {dynamicVariableNames.map((name) => (
            <div
              key={name}
              className="flex items-center rounded-md border p-0.5 px-2"
            >
              <span className="text-sm font-medium text-muted-foreground pr-1">
                {`@${name} =`}
              </span>
              <span className="text-sm font-medium">
                {` ${surveyModel.getVariable(name)}`}
              </span>
            </div>
          ))}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

const ErrorView = () => {
  return <div>Error loading submission answers</div>;
};
