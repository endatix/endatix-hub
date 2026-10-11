"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SelectOption = { value: string; label: string };

export type OptionsSelectProps = {
  id: string;
  value: string;
  options: readonly SelectOption[];
  disabled: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
};

function OptionItems({
  options,
}: Readonly<{ options: readonly SelectOption[] }>) {
  return options.map((option) => (
    <SelectItem key={option.value} value={option.value}>
      {option.label}
    </SelectItem>
  ));
}

/** A full-width single select over a fixed list, labelled by `id` and described by `describedBy`. */
export function OptionsSelect(props: Readonly<OptionsSelectProps>) {
  return (
    <Select
      value={props.value}
      disabled={props.disabled}
      onValueChange={props.onChange}
    >
      <SelectTrigger
        id={props.id}
        aria-describedby={props.describedBy}
        className="w-full"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <OptionItems options={props.options} />
      </SelectContent>
    </Select>
  );
}
