"use client";

import { Button } from "@/components/ui/button";
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
import { useDynamicVariables } from "@/features/public-form/application/use-dynamic-variables.hook";
import { Collapsible } from "@radix-ui/react-collapsible";
import { ChevronsUpDown, CircleHelp, UserRoundSearch } from "lucide-react";
import { useState } from "react";
import { Model } from "survey-react-ui";
import { useSubmissionDetailsViewOptions } from "./submission-details-view-options-context";
import {
  submissionAnswerValueColumnClass,
  submissionMetaRowClass,
} from "./submission-details-value-column";
import CopyToClipboard from "@/components/copy-to-clipboard";
import { cn } from "@/lib/utils";

interface DynamicVariablesListProps {
  surveyModel: Model;
}

const DOCS_URL =
  "https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables-vs-calculated-values";

const DynamicVariablesList = ({ surveyModel }: DynamicVariablesListProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const { variables } = useDynamicVariables(surveyModel);
  const { options } = useSubmissionDetailsViewOptions();

  if (!variables || Object.keys(variables).length === 0) {
    return null;
  }

  if (!options.showDynamicVariables) {
    return null;
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="mb-6 grid h-full grid-cols-5 items-start gap-4"
    >
      <div className="top-0 col-span-2 flex justify-end gap-1 text-right">
        <div className="flex flex-col items-end">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <UserRoundSearch /> Dynamic Variables
          </h4>
          <p className="text-xs text-muted-foreground">
            Runtime values set from metadata or JavaScript.
          </p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="size-8 p-0">
                <CircleHelp />
                <span className="sr-only">
                  Learn more about dynamic variables
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={8} className="max-w-[320px]">
              <p className="mb-1">
                Variables are set at runtime via API/JS and do not automatically
                reevaluate like calculated values.
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
            <ChevronsUpDown className="h-4 w-4" />
            <span className="sr-only">Toggle</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <div className={submissionAnswerValueColumnClass}>
        <CollapsibleContent className="flex flex-col gap-2">
          {Object.entries(variables).map(([name, value]) => {
            const valueToCopy =
              typeof value === "string" && value.trim().length > 0 ? value : "";
            const canCopy = valueToCopy.trim().length > 0;

            return (
              <div
                key={name}
                className={cn(submissionMetaRowClass, "relative")}
              >
                <CopyToClipboard
                  className="mr-4"
                  disabled={!canCopy}
                  copyValue={() => valueToCopy}
                  label="Copy value"
                />
                <div className="flex w-full min-w-0 items-center gap-1.5 pr-8">
                  <span className="shrink-0 text-sm font-medium text-muted-foreground">
                    {`@${name} =`}
                  </span>
                  <span className="truncate text-sm font-medium">
                    {`${value}`}
                  </span>
                </div>
              </div>
            );
          })}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default DynamicVariablesList;
