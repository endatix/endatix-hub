"use client";

import { Columns3, KeyRound } from "lucide-react";
import { FieldWithHelp, helpId } from "@/components/common/field-with-help";
import { PanelSection } from "@/components/common/panel-section";
import { SummaryRow } from "@/components/common/summary-row";
import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import { dataTypeLabel } from "../../property-types";
import { OptionsSelect, type SelectOption } from "../../ui/options-select";
import { TestPersonCheckbox } from "../../ui/test-person-checkbox";
import { identifierKindLabel } from "../../utils";
import {
  choiceColumnGroups,
  columnTally,
  CREATE_COLUMN,
  isChoiceProperty,
  mappableColumns,
  newChoiceGroups,
  SKIP_COLUMN,
  type ChoiceColumnGroup,
  type ColumnMap,
  type NewChoiceGroup,
} from "../column-map";
import { sampleLabel } from "../import-labels";
import { choicesLabel, tidyHeading } from "../new-properties";
import type {
  ImportCsvSetup,
  ImportWizard,
  LoadedFile,
} from "../use-import-csv.hook";

type StepProps = { wizard: ImportWizard; setup: ImportCsvSetup };
type LoadedStepProps = StepProps & { file: LoadedFile };

const IDENTIFIER_ID = "import-identifier";
const SKIP_OPTION: SelectOption = { value: SKIP_COLUMN, label: "Don't import" };
const CREATE_OPTION: SelectOption = {
  value: CREATE_COLUMN,
  label: "Create new property…",
};

function identifierHelp({ wizard, file, setup }: LoadedStepProps): string {
  const { identifierColumn, suggestedIdentifier } = wizard.choices;
  if (!identifierColumn) {
    return `No column is named like the ${identifierKindLabel(setup.identifierKind).toLowerCase()}. Choose the one that holds it.`;
  }
  const sample = sampleLabel(file.preview.samples[identifierColumn]);
  return identifierColumn === suggestedIdentifier
    ? `Suggested from its name. ${sample}`
    : sample;
}

/** Every named column of the file, as the identifier's choices. */
function namedColumns(headers: string[]): SelectOption[] {
  return headers
    .filter(Boolean)
    .map((header) => ({ value: header, label: header }));
}

function IdentifierField(props: Readonly<LoadedStepProps>) {
  const { wizard, file } = props;
  return (
    <FieldWithHelp
      id={IDENTIFIER_ID}
      label="Identifier column"
      help={identifierHelp(props)}
    >
      <OptionsSelect
        id={IDENTIFIER_ID}
        value={wizard.choices.identifierColumn}
        options={namedColumns(file.preview.headers)}
        placeholder="Choose a column"
        describedBy={helpId(IDENTIFIER_ID)}
        disabled={wizard.pending}
        onChange={wizard.choices.chooseIdentifier}
      />
    </FieldWithHelp>
  );
}

function IdentifierSection(props: Readonly<LoadedStepProps>) {
  const kind = identifierKindLabel(props.setup.identifierKind).toLowerCase();
  return (
    <PanelSection
      icon={KeyRound}
      title="Identifier"
      description={`Participants are matched across forms by ${kind}. Choose the column that holds it.`}
    >
      <IdentifierField {...props} />
    </PanelSection>
  );
}

/** Properties another column already feeds: one column per property. */
function takenByOthers(column: string, columns: ColumnMap): Set<string> {
  return new Set(
    Object.entries(columns)
      .filter(([other]) => other !== column)
      .map(([, variableName]) => variableName),
  );
}

/** Properties no other column feeds; a choice property this wizard created from the column stays its own. */
function freeProperties(
  column: string,
  columns: ColumnMap,
  properties: readonly AudienceProperty[],
) {
  const taken = takenByOthers(column, columns);
  return properties.filter(
    (property) =>
      !taken.has(property.variableName) &&
      (!isChoiceProperty(property) ||
        property.variableName === columns[column]),
  );
}

/** Don't import, create a new property, then every property no other column feeds yet. */
function propertyOptions(
  column: string,
  wizard: ImportWizard,
  properties: readonly AudienceProperty[],
): SelectOption[] {
  const free = freeProperties(column, wizard.choices.columns, properties);
  return [
    SKIP_OPTION,
    CREATE_OPTION,
    ...free.map((property) => ({
      value: property.variableName,
      label: `${property.name} · ${dataTypeLabel(property.dataType)}`,
    })),
  ];
}

type ColumnFieldProps = LoadedStepProps & { column: string; index: number };

function ColumnField({ column, index, ...props }: Readonly<ColumnFieldProps>) {
  const { wizard, file } = props;
  const id = `import-column-${index}`;
  return (
    <FieldWithHelp
      id={id}
      label={<span className="font-mono">{column}</span>}
      help={sampleLabel(file.preview.samples[column])}
    >
      <OptionsSelect
        id={id}
        value={wizard.choices.columns[column] ?? SKIP_COLUMN}
        options={propertyOptions(column, wizard, wizard.properties)}
        describedBy={helpId(id)}
        disabled={wizard.pending}
        onChange={(value) => wizard.choices.setColumn(column, value)}
      />
    </FieldWithHelp>
  );
}

type GroupFieldProps = LoadedStepProps & {
  group: NewChoiceGroup;
  index: number;
};

/** A new choice group's choices: not imported, or created as one multiple-choice property. */
function groupOptions(group: NewChoiceGroup): SelectOption[] {
  return [
    SKIP_OPTION,
    {
      value: CREATE_COLUMN,
      label: `Create '${tidyHeading(group.variable)}' (multiple choice)`,
    },
  ];
}

/** One row for a group's `variable__choice` columns, counted once; its suffixes are its choices. */
function GroupField({ group, index, wizard }: Readonly<GroupFieldProps>) {
  const id = `import-column-${index}`;
  return (
    <FieldWithHelp
      id={id}
      label={
        <>
          <span className="sr-only">Columns </span>
          <span className="font-mono">{group.variable}__</span>
        </>
      }
      help={`${group.columns.length} columns: ${choicesLabel(group)}.`}
    >
      <OptionsSelect
        id={id}
        value={wizard.choices.columns[group.key] ?? SKIP_COLUMN}
        options={groupOptions(group)}
        describedBy={helpId(id)}
        disabled={wizard.pending}
        onChange={(value) => wizard.choices.setColumn(group.key, value)}
      />
    </FieldWithHelp>
  );
}

/** Choice properties fill from `variable__choice` columns by name; listed so nothing is a surprise. */
function ChoiceColumns({ groups }: Readonly<{ groups: ChoiceColumnGroup[] }>) {
  if (groups.length === 0) return null;
  return (
    <div className="grid gap-2">
      <p className="text-xs text-muted-foreground">
        Read by their names, so they need no choice:
      </p>
      <dl className="grid gap-2">
        {groups.map(({ property, columns }) => (
          <SummaryRow
            key={property.id}
            label={property.name}
            value={<span className="font-mono">{columns.join(", ")}</span>}
          />
        ))}
      </dl>
    </div>
  );
}

/** Choice properties no column fills: neither read from `variable__choice` columns nor mapped here. */
function unreadChoices(
  properties: readonly AudienceProperty[],
  groups: ChoiceColumnGroup[],
  columns: ColumnMap,
) {
  const read = new Set([
    ...groups.map((group) => group.property.variableName),
    ...Object.values(columns),
  ]);
  return properties.filter(
    (property) =>
      isChoiceProperty(property) && !read.has(property.variableName),
  );
}

function columnsDescription(
  { properties, choices }: ImportWizard,
  groups: ChoiceColumnGroup[],
): string {
  if (properties.length === 0) {
    return "This form has no properties yet, so each column can become a new one.";
  }
  const unread = unreadChoices(properties, groups, choices.columns);
  const base =
    "Each column fills one property. Columns named like a property are matched already; the others become new properties.";
  if (unread.length === 0) return base;
  const names = unread.map((property) => property.name).join(", ");
  return `${base} ${names}: choice properties fill only from columns named like ${unread[0].variableName}__choice.`;
}

function ColumnTally({
  wizard,
  columns,
}: Readonly<{ wizard: ImportWizard; columns: string[] }>) {
  if (columns.length === 0) return null;
  const { mapped, toCreate, ignored } = columnTally(
    columns,
    wizard.choices.columns,
  );
  return (
    <span className="text-xs text-muted-foreground">
      {mapped} mapped, {toCreate} to create, {ignored} ignored
    </span>
  );
}

/** The rows mapped by hand (new choice groups among them) and the choice columns read by name. */
function fileColumns({ file, wizard }: LoadedStepProps) {
  const { headers } = file.preview;
  const { properties, choices } = wizard;
  const { identifierColumn } = choices;
  return {
    columns: mappableColumns(headers, identifierColumn, properties),
    groups: choiceColumnGroups(headers, properties),
    newGroups: newChoiceGroups(headers, identifierColumn, properties),
  };
}

function ColumnsSection(props: Readonly<LoadedStepProps>) {
  const { wizard } = props;
  const { columns, groups, newGroups } = fileColumns(props);
  return (
    <PanelSection
      icon={Columns3}
      title="Columns"
      description={columnsDescription(wizard, groups)}
      aside={<ColumnTally wizard={wizard} columns={columns} />}
    >
      {columns.map((column, index) => {
        const group = newGroups.find((g) => g.key === column);
        return group ? (
          <GroupField key={column} {...props} group={group} index={index} />
        ) : (
          <ColumnField key={column} {...props} column={column} index={index} />
        );
      })}
      <ChoiceColumns groups={groups} />
    </PanelSection>
  );
}

/** Fixed when the import starts, with the columns, so it is chosen here. */
function ImportAsTest({ wizard }: Readonly<{ wizard: ImportWizard }>) {
  return (
    <TestPersonCheckbox
      id="import-as-test"
      label="Import as test participants"
      help="Test participants are never sent a personalized link. Use them to try the form with Test as this participant."
      checked={wizard.choices.asTest}
      disabled={wizard.pending}
      onCheckedChange={wizard.choices.setAsTest}
    />
  );
}

/** Step 2: the identifier, a property (or nothing) for every other column, and test or real. */
export function ImportColumnsStep(props: Readonly<LoadedStepProps>) {
  return (
    <>
      <IdentifierSection {...props} />
      <ColumnsSection {...props} />
      <ImportAsTest wizard={props.wizard} />
    </>
  );
}
