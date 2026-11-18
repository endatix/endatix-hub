import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AuthorText } from "../details/piped-text";
import { ItemValue, QuestionCheckboxModel } from "survey-core";
import { ValueTooltip } from "./value-tooltip";

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
          Checked items:
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
              className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              <AuthorText value={checkedItem.text} survey={question.survey} />
            </Label>
            <ValueTooltip value={question} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CheckboxAnswer;
