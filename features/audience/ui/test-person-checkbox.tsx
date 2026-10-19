"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { helpId } from "@/components/common/field-with-help";

type TestPersonCheckboxProps = {
  id: string;
  label: string;
  help: string;
  checked: boolean;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
};

/** The one test toggle on Add person and the import review: test is chosen when a person is added. */
export function TestPersonCheckbox(props: Readonly<TestPersonCheckboxProps>) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={props.id}
        checked={props.checked}
        disabled={props.disabled}
        aria-describedby={helpId(props.id)}
        onCheckedChange={(checked) => props.onCheckedChange(checked === true)}
      />
      <div className="grid gap-1">
        <Label htmlFor={props.id}>{props.label}</Label>
        <p id={helpId(props.id)} className="text-xs text-muted-foreground">
          {props.help}
        </p>
      </div>
    </div>
  );
}
