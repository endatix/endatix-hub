"use client";

import { FlaskConical, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/common/status-badge";
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

/** Each handler is present only when the reader may run it; none means no actions column. */
export type RowHandlers = {
  onEdit?: (person: AudiencePerson) => void;
  onRemove?: (person: AudiencePerson) => void;
  onTest?: (person: AudiencePerson) => void;
};

type PeopleTableProps = {
  identifierKind: AudienceIdentifierKind;
  properties: AudienceProperty[];
  people: AudiencePerson[];
  handlers: RowHandlers;
};

const ACTIONS_COLUMN: StaticDataTableColumn = {
  key: "actions",
  label: "Actions",
  className: `text-right ${SHRINK}`,
};

const hasActions = ({ onEdit, onRemove, onTest }: RowHandlers) =>
  Boolean(onEdit || onRemove || onTest);

/** The identifier column is named for the match key; one column per property; then actions. */
function peopleColumns(
  kind: AudienceIdentifierKind,
  properties: AudienceProperty[],
  handlers: RowHandlers,
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
    ...(hasActions(handlers) ? [ACTIONS_COLUMN] : []),
  ];
}

type ActionSpec = {
  run: ((person: AudiencePerson) => void) | undefined;
  label: (identifier: string) => string;
  icon: DataTableRowAction["icon"];
};

/** Test, edit, remove; Edit only when there is a value to edit (DESIGN.md §6 "Omit what cannot apply"). */
function actionSpecs(handlers: RowHandlers, hasValues: boolean): ActionSpec[] {
  return [
    {
      run: handlers.onTest,
      label: (id) => `Test as this person: ${id}`,
      icon: FlaskConical,
    },
    {
      run: hasValues ? handlers.onEdit : undefined,
      label: (id) => `Edit values for ${id}`,
      icon: Pencil,
    },
    {
      run: handlers.onRemove,
      label: (id) => `Remove ${id} from this form`,
      icon: Trash2,
    },
  ];
}

/** The row's actions the reader may run; a missing handler leaves its action out. */
function personActions(
  person: AudiencePerson,
  hasValues: boolean,
  handlers: RowHandlers,
): DataTableRowAction[] {
  return actionSpecs(handlers, hasValues).flatMap(({ run, label, icon }) =>
    run
      ? [{ label: label(person.identifier), icon, onClick: () => run(person) }]
      : [],
  );
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

/** A test person carries a Test badge beside their identifier, in the tone of test submissions. */
function IdentifierCell({ person }: Readonly<{ person: AudiencePerson }>) {
  if (!person.isTest) return person.identifier;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {person.identifier}
      <StatusBadge tone="attention" label="Test" />
    </span>
  );
}

function personCells(
  person: AudiencePerson,
  properties: AudienceProperty[],
  handlers: RowHandlers,
): StaticDataTableCell[] {
  const value = (p: AudienceProperty) =>
    formatPropertyValue(p, person.values[p.id]) ?? NOT_SET;
  const identifier = <IdentifierCell person={person} />;
  const cells = [
    dataTableCell("identifier", identifier, IDENTIFIER_CELL),
    ...properties.map((p) => dataTableCell(p.id, value(p), VALUE_CELL)),
  ];
  if (!hasActions(handlers)) return cells;
  const actions = personActions(person, properties.length > 0, handlers);
  const menu = <DataTableRowActions actions={actions} />;
  return [...cells, dataTableCell("actions", menu, ACTIONS_CELL)];
}

/**
 * People on this form, one column per property. Cells are read-only: a row is edited in a panel,
 * so the table stays a reading surface (DESIGN.md §5 List tables).
 */
export function PeopleTable({
  identifierKind,
  properties,
  people,
  handlers,
}: Readonly<PeopleTableProps>) {
  const columns = peopleColumns(identifierKind, properties, handlers);
  return (
    <StaticDataTable columns={columns}>
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
