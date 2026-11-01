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
import type {
  PropertyUse,
  UsageVerdicts,
} from "@/lib/personalization/coverage";
import { formatCount } from "@/lib/utils/formatters";
import { StatusBadge } from "@/components/common/status-badge";
import { NotSet } from "../../ui/not-set";
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
]);
const COVERAGE_COLUMNS: readonly StaticDataTableColumn[] = Object.freeze([
  { key: "used", label: "Used in form", className: SHRINK },
  { key: "filled", label: "Filled in (real)", className: SHRINK },
]);
const ACTIONS_COLUMN: StaticDataTableColumn = {
  key: "actions",
  label: "Actions",
  className: `text-right ${SHRINK}`,
};

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
        {`It matches each participant across forms, so the participants table shows it as their ${label}, not as a property.`}
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

function filledIn({ filledReal, real }: PropertyUse) {
  if (real === 0) return <NotSet label="No real participants" />;
  return `${formatCount(filledReal)} of ${formatCount(real)} filled`;
}

/** What the saved form reads and how many real participants filled it in (the designer's verdict). */
function coverageCells(
  property: AudienceProperty,
  verdicts: UsageVerdicts,
): StaticDataTableCell[] {
  const use = verdicts.forProperty(property.variableName);
  const used = use.used ? (
    <StatusBadge tone="on" label="Used" />
  ) : (
    <StatusBadge tone="off" label="Not used" />
  );
  return [
    dataTableCell("used", used, TYPE_CELL),
    dataTableCell("filled", filledIn(use), TYPE_CELL),
  ];
}

function propertyCells(
  { property, kind }: NameProps,
  { handlers, verdicts }: Pick<PropertiesTableProps, "handlers" | "verdicts">,
): StaticDataTableCell[] {
  const name = <PropertyName property={property} kind={kind} />;
  const cells = [
    dataTableCell("name", name, NAME_CELL),
    dataTableCell("variable", <VariableName value={property.variableName} />),
    dataTableCell("type", dataTypeLabel(property.dataType), TYPE_CELL),
    ...(verdicts ? coverageCells(property, verdicts) : []),
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
  /** The saved form's Audience verdicts; without one there are no coverage columns. */
  verdicts?: UsageVerdicts | null;
};

function tableColumns({
  handlers,
  verdicts,
}: Pick<PropertiesTableProps, "handlers" | "verdicts">) {
  return [
    ...COLUMNS,
    ...(verdicts ? COVERAGE_COLUMNS : []),
    ...(handlers ? [ACTIONS_COLUMN] : []),
  ];
}

/** The match-key property is pinned first; the rest keep their order. */
export function PropertiesTable({
  identifierKind: kind,
  properties,
  handlers,
  verdicts,
}: Readonly<PropertiesTableProps>) {
  return (
    <StaticDataTable columns={tableColumns({ handlers, verdicts })}>
      {matchKeyFirst(properties, kind).map((property, index) => (
        <StaticDataTableRow
          key={property.id}
          index={index}
          cells={propertyCells({ property, kind }, { handlers, verdicts })}
        />
      ))}
    </StaticDataTable>
  );
}
