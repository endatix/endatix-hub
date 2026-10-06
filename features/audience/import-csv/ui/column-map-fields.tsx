"use client";

import { Label } from "@/components/ui/label";
import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import { OptionsSelect } from "../../ui/options-select";
import { SKIP_COLUMN } from "../column-map";

type ColumnMapFieldsProps = {
  headers: string[];
  properties: AudienceProperty[];
  identifierColumn: string;
  columns: Record<string, string>;
  disabled: boolean;
  onIdentifier: (column: string) => void;
  onProperty: (variableName: string, column: string) => void;
};

function headerOptions(headers: string[], includeSkip: boolean) {
  const columns = headers.map((header) => ({ value: header, label: header }));
  return includeSkip
    ? [{ value: SKIP_COLUMN, label: "Don't import" }, ...columns]
    : columns;
}

export function ColumnMapFields(props: Readonly<ColumnMapFieldsProps>) {
  const columnChoices = headerOptions(props.headers, true);
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="import-identifier">Identifier column</Label>
        <OptionsSelect
          id="import-identifier"
          value={props.identifierColumn}
          options={headerOptions(props.headers, false)}
          disabled={props.disabled}
          onChange={props.onIdentifier}
        />
      </div>
      {props.properties.map((property) => (
        <div key={property.id} className="grid gap-1.5">
          <Label htmlFor={`import-${property.variableName}`}>{property.name}</Label>
          <OptionsSelect
            id={`import-${property.variableName}`}
            value={props.columns[property.variableName] ?? SKIP_COLUMN}
            options={columnChoices}
            disabled={props.disabled}
            onChange={(column) => props.onProperty(property.variableName, column)}
          />
        </div>
      ))}
    </div>
  );
}
