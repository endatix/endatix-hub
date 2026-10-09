"use client";

import { Columns3 } from "lucide-react";
import { PanelSection } from "@/components/common/panel-section";
import { Input } from "@/components/ui/input";
import type { AudienceDataType } from "@/lib/endatix-api/audience/types";
import { FieldWithHelp, helpId } from "@/components/common/field-with-help";
import { OptionsSelect } from "../../ui/options-select";
import { CREATABLE_DATA_TYPES } from "../../utils";

const NAME_ID = "add-property-name";
const TYPE_ID = "add-property-type";
const TYPE_HELP =
  "Values are checked against the type when people are added or edited.";

type PropertyEditor = {
  name: string;
  setName: (value: string) => void;
  dataType: AudienceDataType;
  setDataType: (value: AudienceDataType) => void;
  variableName: string;
  pending: boolean;
};

const nameWithoutVariable = (form: PropertyEditor) =>
  Boolean(form.name.trim()) && !form.variableName;

/** Why the variable name matters, or which one this name produces, before it is fixed for good. */
function variableNameHelp(form: PropertyEditor) {
  if (!form.name.trim())
    return "Sets the variable name surveys and exports use. It never changes.";
  if (!form.variableName)
    return "Use at least one letter or digit (a–z, 0–9): the variable name is built from them.";
  const code = (
    <code className="font-mono text-on-surface-variant">
      {form.variableName}
    </code>
  );
  return (
    <>
      Variable name {code}. It never changes, even if you rename the property.
    </>
  );
}

function nameInputProps(form: PropertyEditor) {
  return {
    id: NAME_ID,
    value: form.name,
    placeholder: "Department",
    maxLength: 100,
    disabled: form.pending,
    "aria-invalid": nameWithoutVariable(form),
    "aria-describedby": helpId(NAME_ID),
    autoComplete: "off",
  };
}

function NameField({ form }: Readonly<{ form: PropertyEditor }>) {
  const help = variableNameHelp(form);
  return (
    <FieldWithHelp
      id={NAME_ID}
      label="Name"
      invalid={nameWithoutVariable(form)}
      help={help}
    >
      <Input
        {...nameInputProps(form)}
        onChange={(event) => form.setName(event.target.value)}
      />
    </FieldWithHelp>
  );
}

function TypeField({ form }: Readonly<{ form: PropertyEditor }>) {
  const change = (value: string) => form.setDataType(value as AudienceDataType);
  return (
    <FieldWithHelp id={TYPE_ID} label="Type" help={TYPE_HELP}>
      <OptionsSelect
        id={TYPE_ID}
        value={form.dataType}
        options={CREATABLE_DATA_TYPES}
        disabled={form.pending}
        describedBy={helpId(TYPE_ID)}
        onChange={change}
      />
    </FieldWithHelp>
  );
}

/** Name (with a live variable-name preview) and type of a new property. */
export function PropertyFields({ form }: Readonly<{ form: PropertyEditor }>) {
  return (
    <PanelSection icon={Columns3} title="Property">
      <div className="grid gap-4">
        <NameField form={form} />
        <TypeField form={form} />
      </div>
    </PanelSection>
  );
}
