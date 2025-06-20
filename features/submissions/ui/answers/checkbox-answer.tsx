import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { ItemValue, QuestionCheckboxModel } from "survey-core";

interface CheckboxAnswerProps {
  question: QuestionCheckboxModel;
  className?: string;
}

const CheckboxAnswer = ({ question, className }: CheckboxAnswerProps) => {
  const checkedItems: ItemValue[] = question.selectedChoices;

  if (checkedItems?.length < 1) {
    return (
      <div className={className}>
        <p className="text-sm font-medium text-muted-foreground">
          No items selected
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">
          Checked items
        </p>
        {checkedItems.map((checkedItem) => (
          <div
            key={checkedItem.value}
            className="flex flex-row items-center gap-2"
          >
            <Checkbox
              id={checkedItem.value}
              key={checkedItem.value}
              checked={true}
              disabled={true}
            />
            <Label
              htmlFor={checkedItem.value}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {decodeURIComponent(checkedItem.text)}
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info
                    aria-label="Question Value"
                    className="w-4 h-4 cursor-pointer text-muted-foreground"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Question Value: {question.value}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CheckboxAnswer;