import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from '@/lib/utils';
import { QuestionBooleanModel } from "survey-core";

interface BooleanAnswerProps {
  question: QuestionBooleanModel;
  className?: string;
}

const BooleanAnswer = ({ question, className }: BooleanAnswerProps) => {
  debugger;
  return (
    <div className={cn(className, "flex flex-row gap-2 items-center")}>
      <Label htmlFor={question.name}>{question.labelFalse}</Label>
      <Switch
        id={question.name}
        disabled
        checked={question.value}
      />
      <Label htmlFor={question.name}>{question.labelTrue}</Label>
    </div>
  );
};

export default BooleanAnswer;
