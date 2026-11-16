import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface ResetOption {
  label: string;
  onClick: () => void;
}

interface ResetLayoutItemsProps {
  options: ResetOption[];
  onResetAll: () => void;
  disabled?: boolean;
}

/**
 * Resets the table's column order or visibility: an occasional action, so it sits in the
 * toolbar's `⋯` menu. Renders nothing while the layout is the default.
 */
export function ResetLayoutItems({
  options,
  onResetAll,
  disabled = false,
}: Readonly<ResetLayoutItemsProps>) {
  if (options.length === 0) {
    return null;
  }
  return (
    <>
      <DropdownMenuLabel>Table layout</DropdownMenuLabel>
      {options.map((option) => (
        <DropdownMenuItem
          key={option.label}
          onSelect={option.onClick}
          disabled={disabled}
        >
          {option.label}
        </DropdownMenuItem>
      ))}
      {options.length > 1 ? (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onResetAll} disabled={disabled}>
            Reset All
          </DropdownMenuItem>
        </>
      ) : null}
    </>
  );
}
