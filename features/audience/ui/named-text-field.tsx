"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type NamedTextFieldProps = {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  disabled: boolean;
  className?: string;
  onChange: (value: string) => void;
};

export function NamedTextField(props: Readonly<NamedTextFieldProps>) {
  return (
    <div className="space-y-1">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input
        id={props.id}
        value={props.value}
        placeholder={props.placeholder}
        disabled={props.disabled}
        className={props.className}
        onChange={(event) => props.onChange(event.target.value)}
      />
    </div>
  );
}
