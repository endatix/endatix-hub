import { Minus } from "lucide-react";
import { QuestionLabel } from "../details/question-label";
import { ViewAnswerProps } from "./answer-viewer";
import { cn } from "@/lib/utils";

const UnknownAnswerViewer = ({ forQuestion, className }: ViewAnswerProps) => {
  if (forQuestion.getType() === "html" || forQuestion.getType() === "image") {
    return (
      <>
        <QuestionLabel forQuestion={forQuestion} />
        <Minus className="h-4 w-4" />
      </>
    );
  }

  const isStringValue = typeof forQuestion?.value === "string";

  if (isStringValue) {
    return <p className={className}>{forQuestion.value}</p>;
  }

  return (
    <pre className={cn("w-full text-muted-foreground text-sm", className)}>
      type: {forQuestion.getType()} <br />
      {JSON.stringify(forQuestion.value, null, 2)}
    </pre>
  );
};

export default UnknownAnswerViewer;
