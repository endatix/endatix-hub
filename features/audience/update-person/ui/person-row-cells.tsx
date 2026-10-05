"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import type {
  AudiencePerson,
  AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { Trash2 } from "lucide-react";

type PersonRowCellsProps = {
  person: AudiencePerson;
  properties: AudienceProperty[];
  pending: boolean;
  onSaveValue: (propertyId: string, value: string) => void;
  onDelete: () => void;
};

function ValueCells(props: Omit<PersonRowCellsProps, "onDelete">) {
  return props.properties.map((property) => (
    <TableCell key={property.id}>
      <Input
        defaultValue={props.person.values[property.id] ?? ""}
        disabled={props.pending}
        className="h-8 min-w-28"
        onBlur={(e) => props.onSaveValue(property.id, e.target.value)}
      />
    </TableCell>
  ));
}

export function PersonRowCells(props: Readonly<PersonRowCellsProps>) {
  return (
    <TableRow>
      <TableCell className="font-medium">{props.person.identifier}</TableCell>
      <ValueCells {...props} />
      <TableCell>
        <Button size="icon" variant="ghost" disabled={props.pending} onClick={props.onDelete} aria-label={`Remove ${props.person.identifier}`}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
