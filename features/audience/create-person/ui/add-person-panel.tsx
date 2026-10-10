"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  AudienceIdentifierKind,
  AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { PanelForm } from "@/components/common/panel-form";
import { PersonValueFields } from "../../ui/person-value-fields";
import { identifierKindLabel } from "../../utils";
import { useAddPerson } from "../use-add-person.hook";
import { PersonIdentifierField } from "./person-identifier-field";

type AddPersonPanelProps = {
  formId: string;
  identifierKind: AudienceIdentifierKind;
  properties: AudienceProperty[];
};

const TRIGGER = (
  <Button>
    <Plus />
    Add person
  </Button>
);

/** Copy and shape: a Dialog for the identifier alone, a Sheet once properties make it 3+ fields. */
function panelProps({ identifierKind, properties }: AddPersonPanelProps) {
  const matchedBy = identifierKindLabel(identifierKind).toLowerCase();
  return {
    title: "Add person",
    description: `Adds someone to this form's audience. People are matched across forms by ${matchedBy}.`,
    errorTitle: "Person not added",
    submitLabel: "Add person",
    pendingLabel: "Adding…",
    desktopType:
      properties.length >= 2 ? ("complex" as const) : ("simple" as const),
    trigger: TRIGGER,
  };
}

export function AddPersonPanel(props: Readonly<AddPersonPanelProps>) {
  const form = useAddPerson(props.formId);
  return (
    <PanelForm
      {...form}
      {...panelProps(props)}
      onOpenChange={form.openChange}
      submitDisabled={!form.identifier.trim()}
      onSubmit={form.submit}
    >
      <PersonIdentifierField kind={props.identifierKind} form={form} />
      <PersonValueFields
        idPrefix="add-person"
        description="Optional. A field left empty is not set."
        properties={props.properties}
        editor={form}
      />
    </PanelForm>
  );
}
