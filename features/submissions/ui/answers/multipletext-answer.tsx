import React from "react";
import {
  MultipleTextItemModel,
  Question,
  QuestionMultipleTextModel,
} from "survey-core";
import { QuestionLabel } from "../details/question-label";
import { Input } from "@/components/ui/input";

interface MultipleTextAnswerProps
  extends React.HtmlHTMLAttributes<HTMLDivElement> {
  question: Question;
}

const MultipleTextAnswer = ({ question }: MultipleTextAnswerProps) => {
  return (
    <>
      <QuestionLabel forQuestion={question as QuestionMultipleTextModel} />
      <div className="col-span-3 gap-4">
        {question.items.map((item: MultipleTextItemModel) => (
          <Input
            key={item.name}
            disabled
            id={item.name}
            value={item.value ?? "N/A"}
            className="bg-accent w-full"
          />
        ))}
      </div>
    </>
  );
};

export default MultipleTextAnswer;
