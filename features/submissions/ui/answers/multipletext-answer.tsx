import React from "react";
import { MultipleTextItemModel, QuestionMultipleTextModel } from "survey-core";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MultipleTextAnswerProps
  extends React.HtmlHTMLAttributes<HTMLDivElement> {
  question: QuestionMultipleTextModel;
  className?: string;
}

const MultipleTextAnswer = ({
  question,
  className,
}: MultipleTextAnswerProps) => {
  return (
    <div className={cn("col-span-3 gap-4", className)}>
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
  );
};

export default MultipleTextAnswer;