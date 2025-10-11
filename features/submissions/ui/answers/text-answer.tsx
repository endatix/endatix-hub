import CopyToClipboard from "@/components/copy-to-clipboard";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Question } from "survey-core";

interface TextAnswerProps extends React.HtmlHTMLAttributes<HTMLInputElement> {
  question: Question;
}

function TextAnswer({ question, className }: TextAnswerProps) {
  return (
    <div className="relative">
      {question.value && (
        <CopyToClipboard
          copyValue={() => question.value ?? "N/A"}
          label="Copy text"
        />
      )}
      <Input
        disabled
        id={question.name}
        value={question.value ?? "N/A"}
        className={cn("pl-2 pr-8", className)}
      />
    </div>
  );
}

export default TextAnswer;
