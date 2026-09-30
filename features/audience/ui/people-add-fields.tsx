"use client";

import type {
  AudienceIdentifierKind,
  AudienceProperty,
  AudiencePropertyValues,
} from "@/lib/endatix-api/audience/types";
import { NamedTextField } from "./named-text-field";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

type PeopleAddFieldsProps = {
  identifierKind: AudienceIdentifierKind;
  properties: AudienceProperty[];
  pending: boolean;
  identifier: string;
  values: AudiencePropertyValues;
  onIdentifierChange: (value: string) => void;
  onValueChange: (propertyId: string, value: string) => void;
  onCreate: () => void;
};

function PropertyValueFields(props: {
  properties: AudienceProperty[];
  values: AudiencePropertyValues;
  pending: boolean;
  onValueChange: (propertyId: string, value: string) => void;
}) {
  return props.properties.map((property) => (
    <NamedTextField
      key={property.id}
      id={`new-${property.id}`}
      label={property.name}
      value={props.values[property.id] ?? ""}
      disabled={props.pending}
      className="w-40"
      onChange={(value) => props.onValueChange(property.id, value)}
    />
  ));
}

export function PeopleAddFields(props: Readonly<PeopleAddFieldsProps>) {
  const label = props.identifierKind === "email" ? "Email" : "External ID";
  const placeholder =
    props.identifierKind === "email" ? "alex@example.com" : "ext-1001";
  return (
    <div className="flex flex-wrap items-end gap-3">
      <NamedTextField id="person-identifier" label={label} value={props.identifier} placeholder={placeholder} disabled={props.pending} className="w-56" onChange={props.onIdentifierChange} />
      <PropertyValueFields properties={props.properties} values={props.values} pending={props.pending} onValueChange={props.onValueChange} />
      <Button onClick={props.onCreate} disabled={props.pending || !props.identifier.trim()}>
        <Plus className="mr-2 h-4 w-4" />
        Add person
      </Button>
    </div>
  );
}
