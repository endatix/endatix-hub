import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, RotateCcw } from "lucide-react";

interface ResetOption {
  label: string;
  onClick: () => void;
}

interface ResetOptionsDropdownProps {
  options: ResetOption[];
  onResetAll: () => void;
}

export function ResetOptionsDropdown({
  options,
  onResetAll,
}: ResetOptionsDropdownProps) {
  if (options.length === 0) {
    return null;
  }

  // Single option: show as simple button
  if (options.length === 1) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={options[0].onClick}
        className="px-2 lg:px-3"
      >
        <RotateCcw className="mr-2 h-4 w-4" />
        {options[0].label}
      </Button>
    );
  }

  // Multiple options: show as dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="px-2 lg:px-3">
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {options.map((option) => (
          <DropdownMenuItem key={option.label} onClick={option.onClick}>
            {option.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onResetAll}>Reset All</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
