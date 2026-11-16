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
import { useColumnVisibility } from "./column-visibility-context";

interface ColumnViewOptionsDropdownProps {
  columns: Array<{ id: string; header: string }>;
  disabled?: boolean;
}

export function ColumnViewOptionsDropdown({
  columns,
  disabled = false,
}: Readonly<ColumnViewOptionsDropdownProps>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label="View columns"
        >
          <Settings2 />
          <span className="sr-only sm:not-sr-only">View</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[180px]">
        <ColumnViewOptionsItems columns={columns} disabled={disabled} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The View menu's items. Below 768 px they sit in the toolbar's `⋯` menu instead. */
export function ColumnViewOptionsItems({
  columns,
  disabled = false,
}: Readonly<ColumnViewOptionsDropdownProps>) {
  const { columnVisibility, toggleColumnVisibility } = useColumnVisibility();
  return (
    <>
      <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {columns.map((column) => (
        <DropdownMenuCheckboxItem
          key={column.id}
          checked={columnVisibility[column.id] ?? true}
          onCheckedChange={() => toggleColumnVisibility(column.id)}
          disabled={disabled}
        >
          {column.header}
        </DropdownMenuCheckboxItem>
      ))}
    </>
  );
}
