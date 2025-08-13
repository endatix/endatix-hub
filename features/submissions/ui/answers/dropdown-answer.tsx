import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Minus } from "lucide-react";
import { QuestionDropdownModel } from "survey-core";

interface DropdownAnswerProps {
  question: QuestionDropdownModel;
  className?: string;
}
const DropdownAnswer = ({ question, className }: DropdownAnswerProps) => {
  const text = (() => {
    const selectedItem = question.selectedItem;
    if (selectedItem?.text) {
      return selectedItem.text;
    }
    return String(question.value ?? "");
  })();

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
