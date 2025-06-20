import { ViewAnswerProps } from "./answer-viewer";
import { cn } from "@/lib/utils";

const UnknownAnswerViewer = ({ forQuestion, className }: ViewAnswerProps) => {
  if (forQuestion.getType() === "html" || forQuestion.getType() === "image") {
    return null;
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
