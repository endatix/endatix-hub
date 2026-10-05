"use client";

import type {
  AudienceIdentifierKind,
  AudiencePerson,
  AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import Link from "next/link";
import { PeopleAddForm } from "../../create-person/ui/people-add-form";
import { PeopleTable } from "./people-table";

type Props = {
  formId: string;
  identifierKind: AudienceIdentifierKind;
  properties: AudienceProperty[];
  people: AudiencePerson[];
  totalPeople: number;
  page: number;
  pageSize: number;
};

function PeopleBody({
  formId,
  identifierKind,
  properties,
  people,
}: Pick<Props, "formId" | "identifierKind" | "properties" | "people">) {
  if (people.length === 0) {
    return <p className="text-sm text-muted-foreground">No people yet.</p>;
  }
  return (
    <PeopleTable
      formId={formId}
      identifierKind={identifierKind}
      properties={properties}
      people={people}
    />
  );
}

function PeoplePager({
  formId,
  page,
  pageSize,
  totalPeople,
}: Pick<Props, "formId" | "page" | "pageSize" | "totalPeople">) {
  const pageCount = Math.ceil(totalPeople / pageSize);
  if (pageCount <= 1) return null;
  return (
    <p className="flex gap-3 text-sm text-muted-foreground">
      {page > 1 ? (
        <Link href={`/forms/${formId}/audience?page=${page - 1}`}>Previous</Link>
      ) : null}
      <span>
        Page {page} of {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={`/forms/${formId}/audience?page=${page + 1}`}>Next</Link>
      ) : null}
    </p>
  );
}

export function PeopleSection(props: Readonly<Props>) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">People</h2>
      <p className="text-sm text-muted-foreground">
        Audience members ({props.totalPeople}). Remove drops this form only.
      </p>
      <PeoplePager
        formId={props.formId}
        page={props.page}
        pageSize={props.pageSize}
        totalPeople={props.totalPeople}
      />
      <PeopleAddForm formId={props.formId} identifierKind={props.identifierKind} properties={props.properties} />
      <PeopleBody formId={props.formId} identifierKind={props.identifierKind} properties={props.properties} people={props.people} />
    </section>
  );
}
