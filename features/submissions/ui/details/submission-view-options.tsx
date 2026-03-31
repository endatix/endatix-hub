"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings2 } from "lucide-react";
import { useSubmissionDetailsViewOptions } from "./submission-details-context";

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
          checked={options.showReadOnly}
          onCheckedChange={() => toggleOption("showReadOnly")}
        >
          Show Read-only Questions
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
