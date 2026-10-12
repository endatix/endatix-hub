"use client";

import { Pencil, Trash2 } from "lucide-react";
import {
  DATA_TABLE_SHRINK_WRAP_CLASS_NAME as SHRINK,
  DataTableRowActions,
  dataTableCell,
  StaticDataTable,
  StaticDataTableRow,
  type StaticDataTableCell,
  type StaticDataTableColumn,
} from "@/components/table";
import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import { VariableName } from "../../ui/variable-name";
import { dataTypeLabel } from "../../property-types";

type RowHandlers = {
  onRename: (property: AudienceProperty) => void;
  onDelete: (property: AudienceProperty) => void;
};

const COLUMNS: readonly StaticDataTableColumn[] = Object.freeze([
  { key: "name", label: "Property", className: "min-w-[12rem]" },
  { key: "variable", label: "Variable name" },
  { key: "type", label: "Type", className: SHRINK },
  { key: "actions", label: "Actions", className: `text-right ${SHRINK}` },
]);

function propertyActions(property: AudienceProperty, handlers: RowHandlers) {
  return [
    {
      label: `Rename ${property.name}`,
      icon: Pencil,
      onClick: () => handlers.onRename(property),
    },
    {
      label: `Delete ${property.name}`,
      icon: Trash2,
      onClick: () => handlers.onDelete(property),
    },
  ];
}

const NAME_CELL = "text-sm font-medium break-words whitespace-normal";
const TYPE_CELL = `text-sm text-muted-foreground ${SHRINK}`;

function propertyCells(
  property: AudienceProperty,
  handlers?: RowHandlers,
): StaticDataTableCell[] {
  const cells = [
    dataTableCell("name", property.name, NAME_CELL),
    dataTableCell("variable", <VariableName value={property.variableName} />),
    dataTableCell("type", dataTypeLabel(property.dataType), TYPE_CELL),
  ];
  if (!handlers) return cells;
  const actions = (
    <DataTableRowActions actions={propertyActions(property, handlers)} />
  );
  return [...cells, dataTableCell("actions", actions, `text-right ${SHRINK}`)];
}

type PropertiesTableProps = {
  properties: AudienceProperty[];
  /** Omitted for a read-only reader: the table has no actions column. */
  handlers?: RowHandlers;
};

export function PropertiesTable({
  properties,
  handlers,
}: Readonly<PropertiesTableProps>) {
  const columns = handlers ? COLUMNS : COLUMNS.slice(0, -1);
  return (
    <StaticDataTable columns={columns}>
      {properties.map((property, index) => (
        <StaticDataTableRow
          key={property.id}
          index={index}
          cells={propertyCells(property, handlers)}
        />
      ))}
    </StaticDataTable>
  );
}
