"use client";

import { Pencil, Trash2 } from "lucide-react";
import type {
  AudienceIdentifierKind,
  AudiencePerson,
  AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import {
  DATA_TABLE_SHRINK_WRAP_CLASS_NAME as SHRINK,
  DataTableRowActions,
  dataTableCell,
  StaticDataTable,
  StaticDataTableRow,
  type DataTableRowAction,
  type StaticDataTableCell,
  type StaticDataTableColumn,
} from "@/components/table";
import { formatPropertyValue, identifierKindLabel } from "../../utils";

type RowHandlers = {
  onEdit: (person: AudiencePerson) => void;
  onRemove: (person: AudiencePerson) => void;
};

type PeopleTableProps = RowHandlers & {
  identifierKind: AudienceIdentifierKind;
  properties: AudienceProperty[];
  people: AudiencePerson[];
};

/** The identifier column is named for the match key; one column per property; then actions. */
function peopleColumns(
  kind: AudienceIdentifierKind,
  properties: AudienceProperty[],
): StaticDataTableColumn[] {
  return [
    {
      key: "identifier",
      label: identifierKindLabel(kind),
      className: "min-w-[14rem]",
    },
    ...properties.map((p) => ({
      key: p.id,
      label: p.name,
      className: "min-w-[8rem]",
    })),
    { key: "actions", label: "Actions", className: `text-right ${SHRINK}` },
  ];
}

/** Edit appears only when there is a value to edit (DESIGN.md §6 "Omit what cannot apply"). */
function personActions(
  person: AudiencePerson,
  canEdit: boolean,
  handlers: RowHandlers,
): DataTableRowAction[] {
  const edit = {
    label: `Edit values for ${person.identifier}`,
    icon: Pencil,
    onClick: () => handlers.onEdit(person),
  };
  const remove = {
    label: `Remove ${person.identifier} from this form`,
    icon: Trash2,
    onClick: () => handlers.onRemove(person),
  };
  return canEdit ? [edit, remove] : [remove];
}

const NOT_SET = (
  <span className="text-muted-foreground">
    <span aria-hidden="true">—</span>
    <span className="sr-only">Not set</span>
  </span>
);

const IDENTIFIER_CELL = "text-sm font-medium break-all whitespace-normal";
const VALUE_CELL = "text-sm break-words whitespace-normal";
const ACTIONS_CELL = `text-right ${SHRINK}`;

function personCells(
  person: AudiencePerson,
  properties: AudienceProperty[],
  handlers: RowHandlers,
): StaticDataTableCell[] {
  const actions = personActions(person, properties.length > 0, handlers);
  const value = (p: AudienceProperty) =>
    formatPropertyValue(p, person.values[p.id]) ?? NOT_SET;
  return [
    dataTableCell("identifier", person.identifier, IDENTIFIER_CELL),
    ...properties.map((p) => dataTableCell(p.id, value(p), VALUE_CELL)),
    dataTableCell(
      "actions",
      <DataTableRowActions actions={actions} />,
      ACTIONS_CELL,
    ),
  ];
}

/**
 * People on this form, one column per property. Cells are read-only: a row is edited in a panel,
 * so the table stays a reading surface (DESIGN.md §5 List tables).
 */
export function PeopleTable({
  identifierKind,
  properties,
  people,
  ...handlers
}: Readonly<PeopleTableProps>) {
  return (
    <StaticDataTable columns={peopleColumns(identifierKind, properties)}>
      {people.map((person, index) => (
        <StaticDataTableRow
          key={person.membershipId}
          index={index}
          cells={personCells(person, properties, handlers)}
        />
      ))}
    </StaticDataTable>
  );
}
