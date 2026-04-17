"use client";

import CopyToClipboard from "@/components/copy-to-clipboard";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatValue } from "@/lib/utils/formatters";
import { Calculator, Info, Terminal } from "lucide-react";
import Link from "next/link";
import { SurveyModel } from "survey-core";

interface CalculatedValuesListProps {
  surveyModel: SurveyModel | null;
}

/**
 * Calculated Values List
 * @param surveyModel - The survey model to display the calculated values for
 * @returns The calculated values list
 */
export default function CalculatedValuesList({
  surveyModel,
}: Readonly<CalculatedValuesListProps>) {
  if (!surveyModel) {
    return null;
  }

  const calculatedValues = surveyModel.calculatedValues;
  const hasCalculatedValues = calculatedValues.length > 0;

  if (!hasCalculatedValues) {
    return <EmptyCalculatedValuesList />;
  }

  return (
    <div className="flex-grow space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Calculated Values
        </h2>
        <p className="text-sm text-slate-500">
          Expression-based values reevaluated by SurveyJS in real-time during the submission process. Below is a read-only view of the calculated values that were set and used during the submission process.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="col-span-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
            Variable Name
          </div>
          <div className="col-span-5 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
            Current Value
          </div>
          <div className="col-span-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase flex items-center gap-2">
            Status
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="size-3" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Whether the calculated value is included in the submission result or not.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="col-span-1 text-right text-[10px] font-bold tracking-widest text-slate-500 uppercase">
            Action
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {calculatedValues.map((item) => {
            const hasExpression = Boolean(item.expression?.trim());
            const itemValue = formatValue(item.value);

            return (
              <div
                key={item.name}
                className="group grid grid-cols-12 items-center px-4 py-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
              >
                <div className="col-span-3 flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-500">
                    {item.name}
                  </span>
                </div>
                <div className="col-span-5 flex items-center gap-2">
                  <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-900 dark:bg-slate-800 dark:text-slate-100 truncate">
                    {itemValue}
                  </code>
                  <CopyToClipboard
                    copyValue={itemValue}
                    layout="inline"
                    className="opacity-0 transition-all group-hover:opacity-100"
                    buttonClassName="size-6 hover:bg-white dark:hover:bg-slate-800"
                    tooltipContent="Copy value"
                  />
                </div>
                <div className="col-span-3">
                  <Badge
                    variant={item.includeIntoResult ? "secondary" : "outline"}
                    className="text-[10px] font-bold tracking-tighter uppercase"
                  >
                    {item.includeIntoResult ? "In result" : "Not in result"}
                  </Badge>
                </div>
                <div className="col-span-1 text-right">
                  <CopyToClipboard
                    copyValue={item.expression}
                    layout="inline"
                    disabled={!hasExpression}
                    className="opacity-0 transition-all group-hover:opacity-100"
                    buttonClassName="size-7 hover:bg-white dark:hover:bg-slate-800"
                    tooltipContent={
                      hasExpression ? (
                        <div className="space-y-1 text-left">
                          <p className="text-xs font-bold text-white">
                            Expression (Click to copy)
                          </p>
                          <p className="font-mono text-[10px] break-all text-slate-300">
                            {item.expression}
                          </p>
                        </div>
                      ) : (
                        "No expression set"
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
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="relative col-span-2 overflow-hidden rounded-lg bg-slate-900 p-6 text-white dark:bg-slate-900">
          <div className="relative z-10">
            <h3 className="mb-2 text-sm font-bold">Expression Logic Trace</h3>
            <p className="max-w-sm text-xs leading-relaxed text-slate-400">
              Calculated values are computed dynamically based on the registered expression for the calculated value. If the expression includes questions, variables, or functions, it is recalculated each time their values are changed. More information <Link href="https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#calculated-values" target="_blank" className="underline">here</Link>.
            </p>
          </div>
          <Terminal className="absolute -right-4 -bottom-4 size-32 text-white/5" />
        </div>
        <div className="col-span-1 flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <Info className="size-5 text-amber-500" />
          <div>
            <h3 className="mt-4 text-xs font-bold text-slate-900 dark:text-slate-100">
              System Note
            </h3>
            <p className="text-[10px] text-slate-500">
              Values are recomputed every time the data changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyCalculatedValuesList(): React.ReactNode {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Calculator className="size-6" />
        </EmptyMedia>
        <EmptyTitle>No calculated values</EmptyTitle>
        <EmptyDescription>
          This submission does not have any calculated values.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
