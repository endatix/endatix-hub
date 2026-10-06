"use client";

import type { ReactElement } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AudienceDataType,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { choiceKeysOf } from "../utils";
import { OptionsSelect, type SelectOption } from "./options-select";

/** Radix Select cannot hold "", so "not set" travels as this key and maps back to "". */
const NOT_SET = "__not_set__";
const NOT_SET_OPTION: SelectOption = { value: NOT_SET, label: "Not set" };

type FieldProps = {
  id: string;
  property: AudienceProperty;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
};

const BOOLEAN_OPTIONS: readonly SelectOption[] = Object.freeze([
  NOT_SET_OPTION,
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
]);

const INPUT_TYPES: Readonly<Partial<Record<AudienceDataType, string>>> =
  Object.freeze({
    [AudienceDataType.Number]: "number",
    [AudienceDataType.Date]: "date",
    [AudienceDataType.DateTime]: "datetime-local",
  });

/** `datetime-local` shows minutes only; a stored value with seconds or an offset is trimmed for display. */
function inputValue(property: AudienceProperty, value: string): string {
  if (property.dataType !== AudienceDataType.DateTime) return value;
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value) ? value.slice(0, 16) : "";
}

function TypedInput({
  property,
  value,
  onChange,
  ...props
}: Readonly<FieldProps>) {
  return (
    <Input
      {...props}
      type={INPUT_TYPES[property.dataType] ?? "text"}
      step={property.dataType === AudienceDataType.Number ? "any" : undefined}
      value={inputValue(property, value)}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/** A select with a leading "Not set" that maps to an empty value. */
function NullableSelect({
  options,
  ...props
}: Readonly<FieldProps & { options: readonly SelectOption[] }>) {
  return (
    <OptionsSelect
      {...props}
      value={props.value || NOT_SET}
      options={options}
      onChange={(next) => props.onChange(next === NOT_SET ? "" : next)}
    />
  );
}

function pickedKeys(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function toggledValue(picked: string[], key: string, checked: boolean): string {
  const next = checked ? [...picked, key] : picked.filter((k) => k !== key);
  return next.length > 0 ? JSON.stringify(next) : "";
}

type ChoiceCheckboxProps = {
  choice: string;
  picked: string[];
  field: FieldProps;
};

function ChoiceCheckbox({
  choice,
  picked,
  field,
}: Readonly<ChoiceCheckboxProps>) {
  const toggle = (checked: boolean | "indeterminate") =>
    field.onChange(toggledValue(picked, choice, checked === true));
  return (
    <Label className="flex items-center gap-2 font-normal">
      <Checkbox
        checked={picked.includes(choice)}
        disabled={field.disabled}
        onCheckedChange={toggle}
      />
      {choice}
    </Label>
  );
}

function MultipleChoice(props: Readonly<FieldProps>) {
  const picked = pickedKeys(props.value);
  return (
    <div
      role="group"
      aria-labelledby={`${props.id}-label`}
      className="grid gap-2"
    >
      {choiceKeysOf(props.property).map((choice) => (
        <ChoiceCheckbox
          key={choice}
          choice={choice}
          picked={picked}
          field={props}
        />
      ))}
    </div>
  );
}

const keyOptions = (property: AudienceProperty): SelectOption[] => [
  NOT_SET_OPTION,
  ...choiceKeysOf(property).map((key) => ({ value: key, label: key })),
];

/** One control per data type; anything else is a typed `<input>`. */
const CONTROLS: Readonly<
  Partial<Record<AudienceDataType, (props: FieldProps) => ReactElement>>
> = Object.freeze({
  [AudienceDataType.Boolean]: (props) => (
    <NullableSelect {...props} options={BOOLEAN_OPTIONS} />
  ),
  [AudienceDataType.SingleChoice]: (props) => (
    <NullableSelect {...props} options={keyOptions(props.property)} />
  ),
  [AudienceDataType.MultipleChoice]: (props) => <MultipleChoice {...props} />,
});

const typedInput = (props: FieldProps) => <TypedInput {...props} />;

/**
 * One property value as a form field. The control follows the data type, so it can only produce
 * the wire format the API accepts (`YYYY-MM-DD`, ISO date-time, a plain number, `true`/`false`,
 * choice keys). Emptying it clears the value.
 */
export function PropertyValueField(props: Readonly<FieldProps>) {
  const control = CONTROLS[props.property.dataType] ?? typedInput;
  return (
    <div className="grid gap-2">
      <Label id={`${props.id}-label`} htmlFor={props.id}>
        {props.property.name}
      </Label>
      {control(props)}
    </div>
  );
}
