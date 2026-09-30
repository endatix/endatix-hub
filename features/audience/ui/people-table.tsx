"use client";

import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AudienceIdentifierKind,
  AudiencePerson,
  AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { PersonTableRow } from "./person-table-row";

type Props = {
  formId: string;
  identifierKind: AudienceIdentifierKind;
  properties: AudienceProperty[];
  people: AudiencePerson[];
};

function HeaderRow({
  identifierKind,
  properties,
}: Pick<Props, "identifierKind" | "properties">) {
  const label = identifierKind === "email" ? "Email" : "External ID";
  return (
    <TableHeader>
      <TableRow>
        <TableHead>{label}</TableHead>
        {properties.map((p) => (
          <TableHead key={p.id}>{p.name}</TableHead>
        ))}
        <TableHead className="w-12" />
      </TableRow>
    </TableHeader>
  );
}

function PeopleRows({
  formId,
  properties,
  people,
}: Omit<Props, "identifierKind">) {
  return people.map((person) => (
    <PersonTableRow
      key={person.membershipId}
      formId={formId}
      person={person}
      properties={properties}
    />
  ));
}

export function PeopleTable(props: Readonly<Props>) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <HeaderRow
          identifierKind={props.identifierKind}
          properties={props.properties}
        />
        <TableBody>
          <PeopleRows
            formId={props.formId}
            properties={props.properties}
            people={props.people}
          />
        </TableBody>
      </Table>
    </div>
  );
}
