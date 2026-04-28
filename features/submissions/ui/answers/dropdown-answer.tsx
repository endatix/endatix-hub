import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { QuestionDropdownModel } from "survey-core";

interface DropdownAnswerProps {
  question: QuestionDropdownModel;
  className?: string;
}

function resolveDisplayText(question: QuestionDropdownModel): string {
  const selectedValue = question.value;
  const selectedItem = question.selectedItem;
  if (selectedItem?.text) {
    return selectedItem.text;
  }

  const displayValue = question.getDisplayValue(false, selectedValue);
  if (typeof displayValue === "string" && displayValue.trim().length > 0) {
    return displayValue;
  }

  return String(selectedValue ?? "");
}

const DropdownAnswer = ({ question, className }: DropdownAnswerProps) => {
  const [displayText, setDisplayText] = useState(() =>
    resolveDisplayText(question),
  );

  useEffect(() => {
    const syncDisplayText = () => {
      setDisplayText(resolveDisplayText(question));
    };

    question.onItemValuePropertyChanged.add(syncDisplayText);

    return () => {
      question.onItemValuePropertyChanged.remove(syncDisplayText);
    };
  }, [question]);

  const selectedValue = question.value;

  if (question && selectedValue) {
    return (
      <Select disabled>
        <SelectTrigger className={cn("w-auto min-w-[180px]", className)}>
          <SelectValue placeholder={displayText} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={String(selectedValue)}>{displayText}</SelectItem>
        </SelectContent>
      </Select>
    );
  } else {
    return <Minus className="h-4 w-4" />;
  }
};

export default DropdownAnswer;
