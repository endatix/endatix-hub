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
import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import type { PropertyColumns } from "./use-property-columns.hook";

type ItemProps = { property: AudienceProperty; columns: PropertyColumns };

/** Ticking keeps the menu open, so several columns change at once. */
function PropertyColumnItem({ property, columns }: Readonly<ItemProps>) {
  return (
    <DropdownMenuCheckboxItem
      checked={columns.isShown(property)}
      onCheckedChange={() => columns.toggle(property)}
      onSelect={(event) => event.preventDefault()}
    >
      {property.name}
    </DropdownMenuCheckboxItem>
  );
}

function ColumnsTrigger() {
  return (
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm" aria-label="Columns">
        <Settings2 />
        <span className="sr-only sm:not-sr-only">Columns</span>
      </Button>
    </DropdownMenuTrigger>
  );
}

/**
 * Shows or hides each Property column. The identifier, Link and actions are not offered: they
 * always show.
 */
export function PropertyColumnsMenu({
  columns,
}: Readonly<{ columns: PropertyColumns }>) {
  if (columns.properties.length === 0) return null;
  return (
    <DropdownMenu>
      <ColumnsTrigger />
      <DropdownMenuContent
        align="end"
        className="max-h-80 w-56 overflow-y-auto"
      >
        <DropdownMenuLabel>Property columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.properties.map((property) => (
          <PropertyColumnItem key={property.id} {...{ property, columns }} />
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
