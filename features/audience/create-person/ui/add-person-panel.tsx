"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  AudienceIdentifierKind,
  AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { PanelForm } from "@/components/common/panel-form";
import { PersonValueFields } from "../../ui/person-value-fields";
import { TestPersonCheckbox } from "../../ui/test-person-checkbox";
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

function valueFieldProps({ properties }: AddPersonPanelProps) {
  return {
    idPrefix: "add-person",
    description: "Optional. A field left empty is not set.",
    properties,
  };
}

type TestEditor = {
  isTest: boolean;
  setIsTest: (value: boolean) => void;
  pending: boolean;
};

function AddAsTestField({ form }: Readonly<{ form: TestEditor }>) {
  return (
    <TestPersonCheckbox
      id="add-person-test"
      label="Add as test participant"
      help="A test participant is never sent a personalized link. Use them to try the form with Test as this participant."
      checked={form.isTest}
      disabled={form.pending}
      onCheckedChange={form.setIsTest}
    />
  );
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
      <PersonValueFields {...valueFieldProps(props)} editor={form} />
      <AddAsTestField form={form} />
    </PanelForm>
  );
}
