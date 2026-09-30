"use client";

import { Button } from "@/components/ui/button";
import type { AudienceDataType } from "@/lib/endatix-api/audience/types";
import { DataTypeSelect } from "./data-type-select";
import { NamedTextField } from "./named-text-field";
import { Plus } from "lucide-react";

type Props = {
  pending: boolean;
  name: string;
  dataType: AudienceDataType;
  onNameChange: (value: string) => void;
  onDataTypeChange: (value: AudienceDataType) => void;
  onCreate: () => void;
};

export function PropertyCreateFields(props: Readonly<Props>) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <NamedTextField id="property-name" label="Name" value={props.name} placeholder="Department" disabled={props.pending} className="w-48" onChange={props.onNameChange} />
      <DataTypeSelect value={props.dataType} disabled={props.pending} onChange={props.onDataTypeChange} />
      <Button onClick={props.onCreate} disabled={props.pending || !props.name.trim()}>
        <Plus className="mr-2 h-4 w-4" />
        Add property
      </Button>
    </div>
  );
}
