"use client";

import { Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { PropertyColumns } from "./use-property-columns.hook";

/**
 * Shows or hides each Property column. The identifier, Link and actions are not offered: they
 * always show. The menu stays open while the reader ticks, so several columns change at once.
 */
export function PeopleColumnsMenu({
  columns,
}: Readonly<{ columns: PropertyColumns }>) {
  if (columns.properties.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Columns">
          <Settings2 />
          <span className="sr-only sm:not-sr-only">Columns</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-80 w-56 overflow-y-auto"
      >
        <DropdownMenuLabel>Property columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.properties.map((property) => (
          <DropdownMenuCheckboxItem
            key={property.id}
            checked={columns.isShown(property)}
            onCheckedChange={() => columns.toggle(property)}
            onSelect={(event) => event.preventDefault()}
          >
            {property.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
