import { Minus } from "lucide-react";
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
      {question.value ? (
        <div className="grid grid-cols-3 gap-4">
          {question.items.map((item: MultipleTextItemModel) => (
            <div key={item.name} className="col-span-1">
              <Input
                disabled
                id={item.name}
                value={item.value ?? "N/A"}
                className="col-span-3 bg-accent"
              />
            </div>
          ))}
        </div>
      ) : (
        <Minus className="h-4 w-4" />
      )}
    </>
  );
};

export default MultipleTextAnswer;
