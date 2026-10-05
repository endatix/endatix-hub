"use client";

import type {
  AudienceIdentifierKind,
  AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { PeopleAddFields } from "./people-add-fields";
import { useAddPerson } from "../use-add-person.hook";

type PeopleAddFormProps = {
  formId: string;
  identifierKind: AudienceIdentifierKind;
  properties: AudienceProperty[];
};

export function PeopleAddForm({
  formId,
  identifierKind,
  properties,
}: Readonly<PeopleAddFormProps>) {
  const form = useAddPerson(formId, properties);
  return (
    <PeopleAddFields
      identifierKind={identifierKind}
      properties={properties}
      pending={form.pending}
      identifier={form.identifier}
      values={form.values}
      onIdentifierChange={form.setIdentifier}
      onValueChange={form.setValue}
      onCreate={form.create}
    />
  );
}
