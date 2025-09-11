import { ViewAnswerProps } from "./answer-viewer";
import { cn } from "@/lib/utils";
import CustomAnswer from "./custom-answer";
import { QuestionCustomModel, QuestionCompositeModel } from "survey-core";
import { Input } from "@/components/ui/input";

const UnknownAnswerViewer = ({ forQuestion, className }: ViewAnswerProps) => {
  const questionType = forQuestion.getType();

  if (questionType === "html" || questionType === "image") {
    return null;
  }

  if (
    questionType === "custom" ||
    forQuestion instanceof QuestionCustomModel ||
    forQuestion instanceof QuestionCompositeModel
  ) {
    return (
      <CustomAnswer
        question={forQuestion as QuestionCustomModel | QuestionCompositeModel}
      />
    );
  }

  if (typeof forQuestion?.value === "string") {
    return (
      <Input
        disabled
        id={forQuestion.name}
        value={forQuestion.value ?? "N/A"}
        className={className}
      />
    );
  }

  return (
    <pre className={cn("w-full text-muted-foreground text-sm", className)}>
      type: {questionType} <br />
      {JSON.stringify(forQuestion.value, null, 2)}
    </pre>
  );
};

export default UnknownAnswerViewer;
