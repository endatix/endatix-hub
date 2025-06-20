import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Info, Minus } from "lucide-react";
import React from "react";
import { Question } from "survey-core";

interface TagBoxAnswerProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  question: Question;
}
const TagBoxAnswer = ({ question, className }: TagBoxAnswerProps) => {
  if (!question?.value) {
    return <Minus className="h-4 w-4" />;
  }

  return (
    <div className={cn(className, "flex flex-row gap-2 flex-wrap")}>
      {question.value.map((value: string) => (
        <TagItem
          key={value}
          choice={question.choices.find((c: Question) => c.value === value)}
          value={value}
        />
      ))}
    </div>
  );
};

const TagItem = ({ choice, value }: { choice: Question; value: string }) => {
  return (
    <div
      className="flex flex-row items-center gap-2 bg-primary text-primary-foreground mr-2 rounded-lg px-2 py-1 text-sm font-medium opacity-70"
      key={choice.value}
    >
      {choice.title}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info
              aria-label="Question Value"
              className="w-4 h-4 cursor-pointer text-primary-foreground"
            />
          </TooltipTrigger>
          <TooltipContent>
            <p>Question Value: {value}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
};

export default TagBoxAnswer;
