"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AudienceIdentifierKind } from "@/lib/endatix-api/audience/types";
import { AUDIENCE_IDENTIFIER_KINDS } from "../../utils";

type MatchKeySelectProps = {
  identifierKind: AudienceIdentifierKind;
  disabled: boolean;
  onChange: (value: string) => void;
};

export function MatchKeySelect({
  identifierKind,
  disabled,
  onChange,
}: Readonly<MatchKeySelectProps>) {
  return (
    <>
      <Label>Identifier kind</Label>
      <Select value={identifierKind} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
        <SelectContent>
          {AUDIENCE_IDENTIFIER_KINDS.map((entry) => (
            <SelectItem key={entry.value} value={entry.value}>{entry.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
