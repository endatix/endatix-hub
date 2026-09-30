"use client";

import type {
  AudienceIdentifierKind,
  AudiencePerson,
  AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { PeopleAddForm } from "./people-add-form";
import { PeopleTable } from "./people-table";

type Props = {
  formId: string;
  identifierKind: AudienceIdentifierKind;
  properties: AudienceProperty[];
  people: AudiencePerson[];
  totalPeople: number;
};

function PeopleBody(props: Omit<Props, "totalPeople">) {
  if (props.people.length === 0) {
    return <p className="text-sm text-muted-foreground">No people yet.</p>;
  }
  return <PeopleTable {...props} />;
}

export function PeopleSection(props: Readonly<Props>) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">People</h2>
      <p className="text-sm text-muted-foreground">
        Audience members ({props.totalPeople}). Remove drops this form only.
      </p>
      <PeopleAddForm formId={props.formId} identifierKind={props.identifierKind} properties={props.properties} />
      <PeopleBody formId={props.formId} identifierKind={props.identifierKind} properties={props.properties} people={props.people} />
    </section>
  );
}
