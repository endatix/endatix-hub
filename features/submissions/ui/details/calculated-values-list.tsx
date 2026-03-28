"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatValue } from "@/lib/utils/formatters";
import { Collapsible } from "@radix-ui/react-collapsible";
import { Calculator, ChevronsUpDown, CircleHelp } from "lucide-react";
import { useMemo, useState } from "react";
import CopyToClipboard from "@/components/copy-to-clipboard";
import { cn } from "@/lib/utils";
import { Model } from "survey-react-ui";
import { useSubmissionDetailsViewOptions } from "./submission-details-view-options-context";
import {
  submissionAnswerValueColumnClass,
  submissionMetaRowClass,
} from "./submission-details-value-column";

interface CalculatedValuesListProps {
  surveyModel: Model;
}

interface CalculatedValueItem {
  name: string;
  value: unknown;
  expression: string;
  includeIntoResult: boolean;
}

const DOCS_URL =
  "https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables-vs-calculated-values";

const CalculatedValuesList = ({ surveyModel }: CalculatedValuesListProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const { options } = useSubmissionDetailsViewOptions();

  const calculatedValues = useMemo<CalculatedValueItem[]>(() => {
    const items = surveyModel.calculatedValues ?? [];
    return items.map((item) => {
      const name = item.name ?? "";
      return {
        name,
        value: item.value,
        expression: item.expression ?? "",
        includeIntoResult: Boolean(item.includeIntoResult),
      };
    });
  }, [surveyModel]);

  if (!options.showCalculatedValues || calculatedValues.length === 0) {
    return null;
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mb-6 grid h-full grid-cols-5 items-start gap-4"
    >
      <div className="col-span-2 flex justify-end gap-1 text-right">
        <div className="flex flex-col items-end">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Calculator /> Calculated Values
          </h4>
          <p className="text-xs text-muted-foreground">
            Expression-based values reevaluated by SurveyJS.
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="size-8 p-0">
                <CircleHelp />
                <span className="sr-only">
                  Learn more about calculated values
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} className="max-w-[320px]">
              <p className="mb-1">
                Calculated values are defined by expressions and can be included
                in survey results.
              </p>
              <a
                href={DOCS_URL}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Variables vs Calculated Values
              </a>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-9 p-0">
            <ChevronsUpDown className="size-4" />
            <span className="sr-only">Toggle</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <div className={submissionAnswerValueColumnClass}>
        <CollapsibleContent className="flex flex-col gap-2">
          {calculatedValues.map((item) => {
            const hasExpression = Boolean(item.expression?.trim());
            const itemValue = formatValue(item.value);

            return (
              <div
                key={item.name}
                className={cn(submissionMetaRowClass, "justify-between gap-2")}
              >
                <div className="relative min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-1.5 pr-8">
                    <span className="shrink-0 text-sm font-medium text-muted-foreground">
                      {`${item.name} =`}
                    </span>
                    <span className="truncate text-sm font-medium">
                      {`${itemValue}`}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge
                    variant={item.includeIntoResult ? "secondary" : "outline"}
                  >
                    {item.includeIntoResult ? "In result" : "Not in result"}
                  </Badge>
                  <CopyToClipboard
                    layout="inline"
                    copyValue={() => item.expression}
                    label="Copy expression"
                    disabled={!hasExpression}
                    tooltipContent={
                      hasExpression ? (
                        <ExpressionTooltipContent
                          expression={item.expression}
                        />
                      ) : (
                        <NoExpressionTooltipContent />
                      )
                    }
                    tooltipContentProps={{
                      side: "top",
                      sideOffset: 8,
                      className: "max-w-[420px]",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

const NoExpressionTooltipContent = () => {
  return <p className="font-medium">No expression is set</p>;
};

const ExpressionTooltipContent = ({
  expression,
}: {
  expression?: string | null;
}) => {
  if (!expression) {
    return <NoExpressionTooltipContent />;
  }

  return (
    <>
      <p className="font-medium">Expression</p>
      <p className="text-xs text-muted italic">
        Click to copy the expression to the clipboard.
      </p>
      <p className="text-xs break-words">{expression}</p>
    </>
  );
};

export default CalculatedValuesList;
