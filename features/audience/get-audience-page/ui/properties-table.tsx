"use client";

import { Pencil, Trash2, UserRound } from "lucide-react";
import {
  DATA_TABLE_SHRINK_WRAP_CLASS_NAME as SHRINK,
  DataTableRowActions,
  dataTableCell,
  StaticDataTable,
  StaticDataTableRow,
  type StaticDataTableCell,
  type StaticDataTableColumn,
} from "@/components/table";
import { Badge } from "@/components/ui/badge";
import type {
  AudienceIdentifierKind,
  AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { VariableName } from "../../ui/variable-name";
import { dataTypeLabel } from "../../property-types";
import { identifierKindLabel, matchKeyFirst } from "../../utils";

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

type NameProps = { property: AudienceProperty; kind: AudienceIdentifierKind };

/** Pinned first, tagged with the Person section's icon and wording from the edit panel. */
function MatchKeyName({ property, kind }: Readonly<NameProps>) {
  const label = identifierKindLabel(kind);
  return (
    <span className="flex flex-col gap-1">
      <span className="inline-flex flex-wrap items-center gap-2">
        {property.name}
        <Badge variant="secondary">
          <UserRound aria-hidden="true" />
          Identifier
        </Badge>
      </span>
      <span className="text-xs font-normal text-muted-foreground">
        {`It matches each person across forms, so the people table shows it as their ${label}, not as a property.`}
      </span>
    </span>
  );
}

function PropertyName({ property, kind }: Readonly<NameProps>) {
  return property.variableName === kind ? (
    <MatchKeyName property={property} kind={kind} />
  ) : (
    property.name
  );
}

function propertyCells(
  { property, kind }: NameProps,
  handlers?: RowHandlers,
): StaticDataTableCell[] {
  const name = <PropertyName property={property} kind={kind} />;
  const cells = [
    dataTableCell("name", name, NAME_CELL),
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
  identifierKind: AudienceIdentifierKind;
  properties: AudienceProperty[];
  /** Omitted for a read-only reader: the table has no actions column. */
  handlers?: RowHandlers;
};

/** The match-key property is pinned first; the rest keep their order. */
export function PropertiesTable({
  identifierKind: kind,
  properties,
  handlers,
}: Readonly<PropertiesTableProps>) {
  const columns = handlers ? COLUMNS : COLUMNS.slice(0, -1);
  return (
    <StaticDataTable columns={columns}>
      {matchKeyFirst(properties, kind).map((property, index) => (
        <StaticDataTableRow
          key={property.id}
          index={index}
          cells={propertyCells({ property, kind }, handlers)}
        />
      ))}
    </StaticDataTable>
  );
}
