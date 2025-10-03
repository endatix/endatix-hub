import React from "react";
import { MultipleTextItemModel, QuestionMultipleTextModel } from "survey-core";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import CopyToClipboard from "@/components/copy-to-clipboard";

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
        <div key={item.name} className="relative">
          {item.value && (
            <CopyToClipboard copyValue={() => item.value} label="Copy text" />
          )}
          <Input
            disabled
            id={item.name}
            value={item.value ?? "N/A"}
            className="bg-accent w-full pl-2 pr-8"
          />
        </div>
      ))}
    </div>
  );
};

export default MultipleTextAnswer;
