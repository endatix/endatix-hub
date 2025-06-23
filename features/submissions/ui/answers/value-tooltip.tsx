import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { Question } from "survey-core";

type Primitive = string | number | boolean;
interface ValueTooltipProps {
  value: Question | Primitive;
}

function isQuestion(val: unknown): val is Question {
  return typeof val === 'object' && val !== null && 'value' in val;
}

export const ValueTooltip = ({ value }: ValueTooltipProps) => {
  if (value === undefined || value === null) {
    return null;
  }

  const displayValue = isQuestion(value)
    ? String(value.value)
    : String(value);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info
            aria-label="Question Value"
            className="w-4 h-4 cursor-pointer text-muted-foreground"
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Question Value: {displayValue}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
