"use client";

import { ListPlus } from "lucide-react";
import type { ChangeEvent } from "react";
import { FieldWithHelp, helpId } from "@/components/common/field-with-help";
import { PanelSection } from "@/components/common/panel-section";
import { SummaryRow } from "@/components/common/summary-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AudienceDataType,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { CREATABLE_DATA_TYPES, dataTypeLabel } from "../../property-types";
import { OptionsSelect, type SelectOption } from "../../ui/options-select";
import {
  choicesLabel,
  type NameCheck,
  type VariableHolder,
} from "../new-properties";
import type { TypeSuggestion } from "../type-suggestion";
import type { ImportWizard } from "../use-import-csv.hook";
import type { CheckedDraft } from "../use-new-properties.hook";

type DraftProps = { wizard: ImportWizard; draft: CheckedDraft; index: number };

const NO_VARIABLE =
  "Use at least one letter or digit (a–z, 0–9): the Variable is built from them.";

/** What already writes or holds the variable, and what creating the property anyway would do. */
const HELD_BY: Record<VariableHolder, (variable: string) => string> = {
  question: (v) =>
    `A question in this form already writes ${v}: the property would replace its answers.`,
  calculatedValue: (v) =>
    `A calculated value in this form already writes ${v}: both would write the same value.`,
  property: (v) => `A property of this form already has ${v}.`,
  column: (v) => `Another new property here also gets ${v}.`,
};

function nameHelp(check: NameCheck): string {
  if (check.readBy)
    return `The columns are read by Variable ${check.readBy}, so keep a name that gives ${check.readBy}.`;
  if (check.invalid) return NO_VARIABLE;
  if (!check.holder) return `Variable ${check.variableName}. It never changes.`;
  const held = HELD_BY[check.holder](check.variableName);
  return check.suggestedName ? held : `${held} Choose another name.`;
}

/** The label a reader sees, and the column it belongs to for a screen reader. */
function fieldLabel(label: string, column: string) {
  return (
    <>
      {label}
      <span className="sr-only"> for {column}</span>
    </>
  );
}

/** The free name a collision suggests, one click away; the warning never blocks. */
function UseSuggestedName({ wizard, draft }: Readonly<DraftProps>) {
  const { suggestedName } = draft.check;
  if (!suggestedName) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="justify-self-start"
      disabled={wizard.pending}
      onClick={() => wizard.newProperties.setName(draft.column, suggestedName)}
    >
      Use {suggestedName}
    </Button>
  );
}

function nameInputProps({ wizard, draft }: DraftProps, id: string) {
  const { newProperties } = wizard;
  return {
    id,
    value: draft.name,
    maxLength: 100,
    autoComplete: "off",
    disabled: wizard.pending,
    "aria-invalid": draft.check.invalid,
    "aria-describedby": helpId(id),
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      newProperties.setName(draft.column, event.target.value),
    onBlur: () => newProperties.checkName(draft.name),
  };
}

/** What a draft's fields are for, to a screen reader: its column, or a group's columns. */
const draftTarget = ({ column, group }: CheckedDraft) =>
  group ? `Columns ${group.variable}__` : column;

function NameField(props: Readonly<DraftProps>) {
  const id = `import-new-name-${props.index}`;
  const { check } = props.draft;
  return (
    <FieldWithHelp
      id={id}
      label={fieldLabel("Name", draftTarget(props.draft))}
      invalid={check.invalid}
      help={nameHelp(check)}
    >
      <Input {...nameInputProps(props, id)} />
    </FieldWithHelp>
  );
}

/** The creatable types, single choice when the column's values can be its choices; the suggestion marked. */
function typeOptions(suggestion: TypeSuggestion): SelectOption[] {
  const types = suggestion.choices
    ? [
        ...CREATABLE_DATA_TYPES,
        {
          value: AudienceDataType.SingleChoice,
          label: dataTypeLabel(AudienceDataType.SingleChoice),
        },
      ]
    : CREATABLE_DATA_TYPES;
  return types.map(({ value, label }) => ({
    value,
    label: value === suggestion.dataType ? `${label} (suggested)` : label,
  }));
}

const lowerFirst = (text: string) =>
  text.charAt(0).toLowerCase() + text.slice(1);

/** The evidence behind the suggestion, kept in view once the scripter picks another type. */
function typeHelp({ suggestion, dataType }: CheckedDraft): string {
  const suggested = dataTypeLabel(suggestion.dataType);
  if (suggestion.values.length === 0)
    return `${suggestion.reason}, so ${suggested} is suggested.`;
  const evidence = `values like ${suggestion.values.join(" · ")}: ${lowerFirst(suggestion.reason)}.`;
  return dataType === suggestion.dataType
    ? `Suggested from ${evidence}`
    : `${suggested} is suggested from ${evidence}`;
}

function typeSelectProps({ wizard, draft }: DraftProps, id: string) {
  return {
    id,
    value: draft.dataType,
    options: typeOptions(draft.suggestion),
    describedBy: helpId(id),
    disabled: wizard.pending,
    onChange: (value: string) =>
      wizard.newProperties.setDataType(draft.column, value as AudienceDataType),
  };
}

function TypeField(props: Readonly<DraftProps>) {
  const id = `import-new-type-${props.index}`;
  return (
    <FieldWithHelp
      id={id}
      label={fieldLabel("Type", props.draft.column)}
      help={typeHelp(props.draft)}
    >
      <OptionsSelect {...typeSelectProps(props, id)} />
    </FieldWithHelp>
  );
}

/** A group's type is multiple choice and its choices are its suffixes, so there is nothing to pick. */
function GroupType({ draft }: Readonly<DraftProps>) {
  if (!draft.group) return null;
  return (
    <p className="text-sm text-muted-foreground">
      {dataTypeLabel(draft.dataType)}: {choicesLabel(draft.group)}.
    </p>
  );
}

/** The column a draft is made from, or a group's columns, as its heading. */
function draftHeading({ column, group }: CheckedDraft): string {
  return group ? group.columns.join(", ") : column;
}

function DraftFields(props: Readonly<DraftProps>) {
  return (
    <div className="grid gap-3">
      <p className="font-mono text-sm">{draftHeading(props.draft)}</p>
      <NameField {...props} />
      <UseSuggestedName {...props} />
      {props.draft.group ? <GroupType {...props} /> : <TypeField {...props} />}
    </div>
  );
}

/** Properties already created here, after a later create or the start failed. */
function CreatedProperties({
  properties,
}: Readonly<{ properties: readonly AudienceProperty[] }>) {
  if (properties.length === 0) return null;
  return (
    <dl className="grid gap-2">
      {properties.map((property) => (
        <SummaryRow
          key={property.id}
          label={property.name}
          value={`${dataTypeLabel(property.dataType)} · Created`}
        />
      ))}
    </dl>
  );
}

const DESCRIPTION =
  "Types are suggested from the values in your file. Check each one: the properties are created on this form when you continue.";

/** Step 3, only when a column is queued: a name and a confirmed type for each new property. */
export function ImportPropertiesStep({
  wizard,
}: Readonly<{ wizard: ImportWizard }>) {
  const { drafts } = wizard.newProperties;
  return (
    <PanelSection
      icon={ListPlus}
      title="New properties"
      description={DESCRIPTION}
    >
      {drafts.map((draft, index) => (
        <DraftFields key={draft.column} {...{ wizard, draft, index }} />
      ))}
      <CreatedProperties properties={wizard.createdProperties} />
    </PanelSection>
  );
}
