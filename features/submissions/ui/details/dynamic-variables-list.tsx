"use client";

import CopyToClipboard from "@/components/copy-to-clipboard";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDynamicVariables } from "@/features/public-form/application/use-dynamic-variables.hook";
import { Info, Terminal, UserRoundSearch } from "lucide-react";
import Link from "next/link";
import { SurveyModel } from "survey-core";
import { isSensitiveVariableName } from "../../submission-utils";

export interface DynamicVariablesListProps {
  surveyModel: SurveyModel | null;
}

function DynamicVariablesList({
  surveyModel,
}: Readonly<DynamicVariablesListProps>) {
  const { variables, hasVariables } = useDynamicVariables(surveyModel);

  if (!hasVariables) {
    return <EmptyDynamicVariablesList />;
  }

  return (
    <div className="flex-grow space-y-8">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          Dynamic Variables
        </h2>
        <p className="text-sm text-slate-500">
          These are runtime values set from the Submission metadata or
          JavaScript. Here is a read-only view of the variables that were set
          and used during the submission process.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="grid grid-cols-12 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="col-span-5 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
            Variable Name
          </div>
          <div className="col-span-6 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
            Value
          </div>
          <div className="col-span-1 text-right text-[10px] font-bold tracking-widest text-slate-500 uppercase">
            Action
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Object.entries(variables).map(([name, value]) => {
            const valueStr = String(value);
            const isSensitive = isSensitiveVariableName(name);

            return (
              <div
                key={name}
                className="group grid grid-cols-12 items-center px-4 py-3 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/30"
              >
                <div className="col-span-5 flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-500">
                    @{name}
                  </span>
                </div>
                <div className="col-span-6 truncate">
                  {isSensitive ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            {"•".repeat(Math.min(String(value).length, 8))}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            Cannot display sensitive variable:{" "}
                            <code>{name}</code>
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <code className="truncate rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-900 dark:bg-slate-800 dark:text-slate-100">
                      {valueStr}
                    </code>
                  )}
                </div>
                <div className="col-span-1 text-right">
                  <CopyToClipboard
                    copyValue={valueStr}
                    layout="inline"
                    className="opacity-0 transition-all group-hover:opacity-100"
                    buttonClassName="size-7 hover:bg-white dark:hover:bg-slate-800"
                    disabled={isSensitive}
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
            <h3 className="mb-2 text-sm font-bold">Advanced Logic Debugging</h3>
            <p className="max-w-sm text-xs leading-relaxed text-slate-400">
              Use these variables to trace conditional logic across the entire
              submission workflow. Values are updated in real-time as background
              scripts execute. More information about calculated values can be
              found in the{" "}
              <Link
                href="https://surveyjs.io/form-library/documentation/design-survey/conditional-logic#variables"
                target="_blank"
                className="underline"
              >
                documentation
              </Link>
              .
            </p>
          </div>
          <Terminal className="absolute -right-4 -bottom-4 size-32 text-white/5" />
        </div>
        <div className="col-span-1 flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <Info className="size-5 text-amber-500" />
          <div>
            <h3 className="mt-4 text-xs font-bold text-slate-900 dark:text-slate-100">
              Security Notice
            </h3>
            <p className="text-[10px] text-slate-500">
              Sensitive variables are masked by default.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyDynamicVariablesList(): React.ReactNode {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UserRoundSearch className="size-6" />
        </EmptyMedia>
        <EmptyTitle>No dynamic variables</EmptyTitle>
        <EmptyDescription>
          This submission does not have any dynamic variables.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

export default DynamicVariablesList;
