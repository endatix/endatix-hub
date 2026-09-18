import CopyToClipboard from "@/components/copy-to-clipboard";
import { cn } from "@/lib/utils";
import { Question } from "survey-core";

interface TextAnswerProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  question: Question;
}

function TextAnswer({ question, className }: TextAnswerProps) {
  const value = question.value ?? "N/A";

  return (
    <div className="flex w-full min-w-0 items-start gap-1">
      <span
        className={cn(
          "min-w-0 flex-1 py-1 text-sm break-words whitespace-normal",
          className,
        )}
      >
        {value}
      </span>
      {question.value && (
        <CopyToClipboard
          copyValue={() => question.value ?? "N/A"}
          label="Copy text"
          layout="inline"
          buttonClassName="size-6 shrink-0"
          className="mt-0.5"
        />
      )}
    </div>
  );
}

export default TextAnswer;
