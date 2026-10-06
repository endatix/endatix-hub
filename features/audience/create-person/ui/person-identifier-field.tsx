"use client";

import { UserRound } from "lucide-react";
import { PanelSection } from "@/components/common/panel-section";
import { Input } from "@/components/ui/input";
import type { AudienceIdentifierKind } from "@/lib/endatix-api/audience/types";
import { FieldWithHelp, helpId } from "@/components/common/field-with-help";
import {
  identifierKindHelp,
  identifierKindLabel,
  identifierKindPlaceholder,
} from "../../utils";

const ID = "add-person-identifier";

type IdentifierEditor = {
  identifier: string;
  setIdentifier: (value: string) => void;
  pending: boolean;
};
type Props = { kind: AudienceIdentifierKind; form: IdentifierEditor };

function inputProps({ kind, form }: Props) {
  return {
    id: ID,
    value: form.identifier,
    placeholder: identifierKindPlaceholder(kind),
    disabled: form.pending,
    "aria-describedby": helpId(ID),
    autoComplete: "off",
  };
}

/** The match-key field, labelled and explained by the tenant's match key. */
export function PersonIdentifierField(props: Readonly<Props>) {
  const { kind, form } = props;
  return (
    <PanelSection icon={UserRound} title="Person">
      <FieldWithHelp
        id={ID}
        label={identifierKindLabel(kind)}
        help={identifierKindHelp(kind)}
      >
        <Input
          {...inputProps(props)}
          onChange={(event) => form.setIdentifier(event.target.value)}
        />
      </FieldWithHelp>
    </PanelSection>
  );
}
