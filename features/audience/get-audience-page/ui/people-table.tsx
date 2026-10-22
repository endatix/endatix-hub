"use client";

import { FlaskConical, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AudienceLinkStatusKind,
  type AudienceIdentifierKind,
  type AudiencePerson,
  type AudienceProperty,
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
import type { AudienceReview } from "@/lib/personalization/authoring";
import { formRoutes } from "@/lib/routes/form-routes";
import { Badge } from "@/components/ui/badge";
import { LinkStatusBadge } from "../../ui/link-status-badge";
import { NotSet } from "../../ui/not-set";
import { SubmissionLink } from "../../ui/submission-link";
import { WithTestBadge } from "../../ui/test-badge";
import { formatPropertyValue, identifierKindLabel } from "../../utils";

/** Each handler is present only when the reader may run it; none means no actions column. */
export type RowHandlers = {
  onEdit?: (person: AudiencePerson) => void;
  onRemove?: (person: AudiencePerson) => void;
  onTest?: (person: AudiencePerson) => void;
};

type PeopleTableProps = {
  formId: string;
  identifierKind: AudienceIdentifierKind;
  properties: AudienceProperty[];
  people: AudiencePerson[];
  handlers: RowHandlers;
  /** The participant page needs `forms.edit`; without it the identifier is plain text. */
  canEdit: boolean;
  /** The saved form's Audience review: marks participants missing values it reads. */
  review?: AudienceReview | null;
};

const ACTIONS_COLUMN: StaticDataTableColumn = {
  key: "actions",
  label: "Actions",
  className: `text-right ${SHRINK}`,
};

const LINK_COLUMN: StaticDataTableColumn = {
  key: "link",
  label: "Link",
  className: SHRINK,
};

const hasActions = ({ onEdit, onRemove, onTest }: RowHandlers) =>
  Boolean(onEdit || onRemove || onTest);

/** Link shows only when someone on this page has one, read from the page's own rows. */
const hasLinks = (people: AudiencePerson[]) =>
  people.some((p) => p.link.status !== AudienceLinkStatusKind.None);

type ColumnOptions = { showLink: boolean; handlers: RowHandlers };

/** The identifier column is named for the match key; Link; one column per property; then actions. */
function peopleColumns(
  kind: AudienceIdentifierKind,
  properties: AudienceProperty[],
  { showLink, handlers }: ColumnOptions,
): StaticDataTableColumn[] {
  return [
    {
      key: "identifier",
      label: identifierKindLabel(kind),
      className: "min-w-[14rem]",
    },
    ...(showLink ? [LINK_COLUMN] : []),
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

const IDENTIFIER_CELL = "text-sm font-medium break-all whitespace-normal";
const VALUE_CELL = "text-sm break-words whitespace-normal";
const ACTIONS_CELL = `text-right ${SHRINK}`;

const PARTICIPANT_LINK =
  "rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

type IdentifierCellProps = CellProps & {
  canOpen: boolean;
  notFilledIn?: ReactNode;
};

/** The identifier opens the participant's page for a reader who may reach it. */
function ParticipantLink({
  formId,
  person,
  canOpen,
}: Readonly<IdentifierCellProps>) {
  if (!canOpen) return person.identifier;
  const href = formRoutes.participant(formId, person.audienceMemberId);
  return (
    <Link href={href} className={PARTICIPANT_LINK}>
      {person.identifier}
    </Link>
  );
}

/** The names of the properties this person has a value for. */
function filledNames(person: AudiencePerson, properties: AudienceProperty[]) {
  return properties
    .filter((p) => (person.values[p.id] ?? "") !== "")
    .map((p) => p.variableName);
}

type NotFilledInProps = { names: string[]; properties: AudienceProperty[] };

/** The properties the saved form reads that this person has no value for. */
function NotFilledIn({ names, properties }: Readonly<NotFilledInProps>) {
  if (names.length === 0) return null;
  const label = names
    .map(
      (name) => properties.find((p) => p.variableName === name)?.name ?? name,
    )
    .join(", ");
  return (
    <Badge
      variant="outline"
      className="border-orange-300 text-orange-700 dark:border-orange-800 dark:text-orange-300"
      aria-label={`Not filled in: ${label}`}
      title={`Not filled in: ${label}`}
    >
      {names.length} not filled in
    </Badge>
  );
}

function notFilledInMark(
  person: AudiencePerson,
  properties: AudienceProperty[],
  review: AudienceReview | null | undefined,
) {
  const missing = review?.notFilledIn(filledNames(person, properties)) ?? [];
  return <NotFilledIn names={missing} properties={properties} />;
}

/** A test person also carries a Test badge, in the tone of test submissions. */
function IdentifierCell(props: Readonly<IdentifierCellProps>) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <WithTestBadge isTest={props.person.isTest}>
        <ParticipantLink {...props} />
      </WithTestBadge>
      {props.notFilledIn}
    </span>
  );
}

const NO_TEST_LINK = <NotSet label="No link: a test person" />;

type CellProps = { formId: string; person: AudiencePerson };

/** Not issued, Issued, or Opened; Opened goes to the response while it still exists. */
function LinkCell({ formId, person }: Readonly<CellProps>) {
  if (person.isTest) return NO_TEST_LINK;
  const { link } = person;
  const badge = <LinkStatusBadge status={link.status} />;
  if (link.status !== AudienceLinkStatusKind.Opened || !link.submissionId)
    return badge;
  const { submissionId } = link;
  return (
    <SubmissionLink
      {...{ formId, submissionId }}
      srLabel={`: view the response of ${person.identifier}`}
    >
      {badge}
    </SubmissionLink>
  );
}

type CellOptions = ColumnOptions & {
  formId: string;
  canEdit: boolean;
  review?: AudienceReview | null;
};

function identifierCell(
  person: AudiencePerson,
  properties: AudienceProperty[],
  { formId, canEdit, review }: Omit<CellOptions, keyof ColumnOptions>,
): StaticDataTableCell {
  const mark = notFilledInMark(person, properties, review);
  const identifier = (
    <IdentifierCell
      formId={formId}
      person={person}
      canOpen={canEdit}
      notFilledIn={mark}
    />
  );
  return dataTableCell("identifier", identifier, IDENTIFIER_CELL);
}

function personCells(
  person: AudiencePerson,
  properties: AudienceProperty[],
  { formId, showLink, handlers, canEdit, review }: CellOptions,
): StaticDataTableCell[] {
  const value = (p: AudienceProperty) =>
    formatPropertyValue(p, person.values[p.id]) ?? <NotSet />;
  const cell = { formId, person };
  const link = <LinkCell {...cell} />;
  const cells = [
    identifierCell(person, properties, { formId, canEdit, review }),
    ...(showLink ? [dataTableCell("link", link, SHRINK)] : []),
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
export function PeopleTable(props: Readonly<PeopleTableProps>) {
  const { identifierKind, properties, people } = props;
  const options = { ...props, showLink: hasLinks(people) };
  const columns = peopleColumns(identifierKind, properties, options);
  return (
    <StaticDataTable columns={columns}>
      {people.map((person, index) => (
        <StaticDataTableRow
          key={person.membershipId}
          index={index}
          cells={personCells(person, properties, options)}
        />
      ))}
    </StaticDataTable>
  );
}
