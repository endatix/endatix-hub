"use client";

import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useSubmissionDetailsViewOptions } from "./submission-details-view-options-context";

interface SubmissionViewOptionsProps {
  submissionLanguageName?: string;
}

export function SubmissionViewOptions({
  submissionLanguageName,
}: SubmissionViewOptionsProps) {
  const { options, toggleOption, resetOptions } =
    useSubmissionDetailsViewOptions();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[220px]">
        <DropdownMenuLabel>View Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={options.showInvisibleItems}
          onCheckedChange={() => toggleOption("showInvisibleItems")}
        >
          Show Invisible Items
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={options.showDynamicVariables}
          onCheckedChange={() => toggleOption("showDynamicVariables")}
        >
          Show Dynamic Variables
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={options.showCalculatedValues}
          onCheckedChange={() => toggleOption("showCalculatedValues")}
        >
          Show Calculated Values
        </DropdownMenuCheckboxItem>
        {submissionLanguageName && (
          <DropdownMenuCheckboxItem
            checked={options.useSubmissionLanguage}
            onCheckedChange={() => toggleOption("useSubmissionLanguage")}
          >
            {`Display in ${submissionLanguageName}`}
          </DropdownMenuCheckboxItem>
        )}
        <DropdownMenuSeparator />
        <Button
          variant="ghost"
          size="sm"
          className="mt-1 w-full"
          onClick={resetOptions}
        >
          Reset to Default
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
