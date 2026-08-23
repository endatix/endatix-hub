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
  disabled?: boolean;
}

export function ResetOptionsDropdown({
  options,
  onResetAll,
  disabled = false,
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
          disabled={disabled}
          aria-label={options[0].label}
        >
          <RotateCcw />
          <span className="sr-only sm:not-sr-only">{options[0].label}</span>
        </Button>
    );
  }

  // Multiple options: show as dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label="Reset table options"
        >
          <RotateCcw />
          <span className="sr-only sm:not-sr-only">Reset</span>
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {options.map((option) => (
          <DropdownMenuItem key={option.label} onClick={option.onClick} disabled={disabled}>
            {option.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onResetAll} disabled={disabled}>Reset All</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
