"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PropertyRowEditProps = {
  editName: string;
  pending: boolean;
  onEditNameChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

export function PropertyRowEdit(props: Readonly<PropertyRowEditProps>) {
  return (
    <li className="flex flex-wrap items-center gap-2 px-4 py-3">
      <Input
        value={props.editName}
        onChange={(e) => props.onEditNameChange(e.target.value)}
        className="max-w-xs"
        disabled={props.pending}
      />
      <Button size="sm" onClick={props.onSave} disabled={props.pending || !props.editName.trim()}>
        Save
      </Button>
      <Button size="sm" variant="ghost" onClick={props.onCancel} disabled={props.pending}>
        Cancel
      </Button>
    </li>
  );
}
