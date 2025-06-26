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

export function SubmissionViewOptions() {
  const { options, toggleOption, resetOptions } =
    useSubmissionDetailsViewOptions();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
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
        <DropdownMenuSeparator />
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-1"
          onClick={resetOptions}
        >
          Reset to Default
        </Button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
