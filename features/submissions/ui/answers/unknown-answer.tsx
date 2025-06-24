import { ViewAnswerProps } from "./answer-viewer";
import { cn } from "@/lib/utils";
import CustomAnswer from "./custom-answer";
import { QuestionCustomModel, QuestionCompositeModel } from "survey-core";

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

  const isStringValue = typeof forQuestion?.value === "string";

  if (isStringValue) {
    return <p className={className}>{forQuestion.value}</p>;
  }

  return (
    <pre className={cn("w-full text-muted-foreground text-sm", className)}>
      type: {questionType} <br />
      {JSON.stringify(forQuestion.value, null, 2)}
    </pre>
  );
};

export default UnknownAnswerViewer;
