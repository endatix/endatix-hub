import { QuestionLabel } from "../details/question-label";
import { ViewAnswerProps } from "./answer-viewer";

const UnknownAnswerViewer = ({ forQuestion }: ViewAnswerProps) => {
  if (forQuestion.getType() === "html" || forQuestion.getType() === "image") {
    return null;
  }

  const isStringValue = typeof forQuestion?.value === "string";

  return (
    <>
      <QuestionLabel forQuestion={forQuestion} />
      {isStringValue ? (
        <p className="col-span-3">{forQuestion.value}</p>
      ) : (
        <pre className="col-span-3 text-muted-foreground text-sm">
          {JSON.stringify(forQuestion.value, null, 2)}
        </pre>
      )}
    </>
  );
};

export default UnknownAnswerViewer;
