"use client";

import type {
  AudiencePerson,
  AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { PersonRowCells } from "./person-row-cells";
import { usePersonRow } from "./use-person-row";

type PersonTableRowProps = {
  formId: string;
  person: AudiencePerson;
  properties: AudienceProperty[];
};

export function PersonTableRow({
  formId,
  person,
  properties,
}: Readonly<PersonTableRowProps>) {
  const row = usePersonRow(formId, person);
  return (
    <PersonRowCells
      person={person}
      properties={properties}
      pending={row.pending}
      onSaveValue={row.saveValue}
      onDelete={row.remove}
    />
  );
}
