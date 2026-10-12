"use client";

import { KeyRound } from "lucide-react";
import type {
  AudienceIdentifierKind,
  AudiencePerson,
  AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { FieldWithHelp } from "@/components/common/field-with-help";
import { PanelForm } from "@/components/common/panel-form";
import { PanelSection } from "@/components/common/panel-section";
import { Input } from "@/components/ui/input";
import { PersonValueFields } from "../../ui/person-value-fields";
import { identifierKindHelp, identifierKindLabel } from "../../utils";
import { closeWhenIdle } from "../../use-panel-state.hook";
import { useEditPerson } from "../use-edit-person.hook";

const IDENTIFIER_ID = "edit-person-identifier";

type EditPersonPanelProps = {
  formId: string;
  person: AudiencePerson | null;
  open: boolean;
  identifierKind: AudienceIdentifierKind;
  properties: AudienceProperty[];
  onClose: () => void;
};

/** The match key, above the properties, with the key mark. It is not a property value. */
function MatchKeyField({
  kind,
  identifier,
}: Readonly<{ kind: AudienceIdentifierKind; identifier: string }>) {
  return (
    <PanelSection
      icon={KeyRound}
      title="Identifier"
      description="How this person is matched. It cannot be changed."
    >
      <FieldWithHelp
        id={IDENTIFIER_ID}
        label={identifierKindLabel(kind)}
        help={identifierKindHelp(kind)}
      >
        <Input id={IDENTIFIER_ID} value={identifier} disabled readOnly />
      </FieldWithHelp>
    </PanelSection>
  );
}

function valueProperties(
  properties: readonly AudienceProperty[],
  kind: AudienceIdentifierKind,
) {
  return properties.filter((property) => property.variableName !== kind);
}

/** The identifier is the title: it cannot change. A Sheet once there are 3+ properties. */
type PanelState = EditPersonPanelProps & { pending: boolean };

function panelProps({
  person,
  open,
  properties,
  onClose,
  pending,
}: PanelState) {
  return {
    open: open && person !== null,
    onOpenChange: closeWhenIdle(pending, onClose),
    title: person?.identifier,
    description:
      "Values for this person on this form. Emptying a field clears it.",
    errorTitle: "Changes not saved",
    submitLabel: "Save changes",
    pendingLabel: "Saving…",
    desktopType:
      properties.length >= 3 ? ("complex" as const) : ("simple" as const),
  };
}

/** Render it with a `key` that changes on every open so each opening starts fresh. */
export function EditPersonPanel(props: Readonly<EditPersonPanelProps>) {
  const { formId, person, onClose: onDone } = props;
  const form = useEditPerson({ formId, person, onDone });
  const panel = panelProps({ ...props, pending: form.pending });
  return (
    <PanelForm {...form} {...panel} onSubmit={form.submit}>
      {person ? (
        <MatchKeyField kind={props.identifierKind} identifier={person.identifier} />
      ) : null}
      <PersonValueFields
        idPrefix="edit-person"
        description="Only the fields you change are saved."
        properties={valueProperties(props.properties, props.identifierKind)}
        editor={form}
      />
    </PanelForm>
  );
}
