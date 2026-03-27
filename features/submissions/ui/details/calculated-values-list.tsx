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
import { Collapsible } from "@radix-ui/react-collapsible";
import { Calculator, ChevronsUpDown, CircleHelp } from "lucide-react";
import { useMemo, useState } from "react";
import { Model } from "survey-react-ui";
import { useSubmissionDetailsViewOptions } from "./submission-details-view-options-context";

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
      debugger
      return {
        name,
        value: surveyModel.getValue(name),
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
      <div className="col-span-3">
        <CollapsibleContent className="flex flex-col gap-2">
          {calculatedValues.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between rounded-md border px-2 py-1"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-muted-foreground">
                  {`${item.name} =`}
                </span>
                <span className="text-sm font-medium">{`${item.value ?? ""}`}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={item.includeIntoResult ? "secondary" : "outline"}
                >
                  {item.includeIntoResult ? "In result" : "Not in result"}
                </Badge>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 px-2">
                        Expression
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      sideOffset={8}
                      className="max-w-[420px]"
                    >
                      <p className="font-medium">Expression</p>
                      <p className="text-xs break-words">
                        {item.expression || "-"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          ))}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default CalculatedValuesList;
