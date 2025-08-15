import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Minus } from "lucide-react";
import React from "react";
import { Question } from "survey-core";
import { ValueTooltip } from "./value-tooltip";

interface TagBoxAnswerProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  question: Question;
}
const TagBoxAnswer = ({ question, className }: TagBoxAnswerProps) => {
  if (!question?.value) {
    return <Minus className="h-4 w-4" />;
  }

  const choices = question.choices;
  if (question.isOtherSelected) {
    choices.push(question.otherItemValue);
  }

  return (
    <div className={cn(className, "flex flex-row gap-2 flex-wrap")}>
      {question.value.map((value: string) => (
        <TagItem
          key={value}
          choice={question.choices.find((c: Question) => c.value === value)}
        />
      ))}
    </div>
  );
};

const TagItem = ({ choice }: { choice: Question }) => {
  if (!choice) {
    console.error("Choice not found", choice);
    return null;
  }

  return (
    <Badge
      variant="outline"
      className="flex flex-row items-center gap-2 text-sm font-medium"
      key={choice?.value}
    >
      {choice?.title ?? choice?.text}
      <ValueTooltip value={choice} />
    </Badge>
  );
};

export default TagBoxAnswer;
