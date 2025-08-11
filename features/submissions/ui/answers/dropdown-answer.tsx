import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Minus } from "lucide-react";
import React from "react";
import { Question } from "survey-core";

interface DropdownAnswerProps extends React.HtmlHTMLAttributes<HTMLDivElement> {
  question: Question;
}
const DropdownAnswer = ({ question, className }: DropdownAnswerProps) => {
  const text = React.useMemo(() => {
    const selectedItem = (question as unknown as { selectedItem?: { text?: string } }).selectedItem;
    if (selectedItem?.text) {
      return selectedItem.text;
    }
    return String(question.value ?? "");
  }, [question, question.value, (question as any)?.selectedItem?.text]);

  if (question && question.value) {
    return (
      <Select disabled>
        <SelectTrigger className={cn("min-w-[180px] w-auto", className)}>
          <SelectValue placeholder={text} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={String(question.value)}>{text}</SelectItem>
        </SelectContent>
      </Select>
    );
  } else {
    return <Minus className="h-4 w-4" />;
  }
};

export default DropdownAnswer;
