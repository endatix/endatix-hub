import React from "react";
import { MultipleTextItemModel, QuestionMultipleTextModel } from "survey-core";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import CopyToClipboard from "@/components/copy-to-clipboard";

interface MultipleTextAnswerProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
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
        <div key={item.name} className="flex min-w-0 items-center gap-1">
          <Input
            disabled
            id={item.name}
            value={item.value ?? "N/A"}
            className="min-w-0 flex-1 bg-accent pl-2"
          />
          {item.value && (
            <CopyToClipboard
              copyValue={() => item.value}
              label="Copy text"
              layout="inline"
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default MultipleTextAnswer;
