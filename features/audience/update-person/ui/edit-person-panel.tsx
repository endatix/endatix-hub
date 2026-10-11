"use client";

import type {
  AudiencePerson,
  AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { PanelForm } from "@/components/common/panel-form";
import { PersonValueFields } from "../../ui/person-value-fields";
import { closeWhenIdle } from "../../use-panel-state.hook";
import { useEditPerson } from "../use-edit-person.hook";

type EditPersonPanelProps = {
  formId: string;
  person: AudiencePerson | null;
  open: boolean;
  properties: AudienceProperty[];
  onClose: () => void;
};

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
      <PersonValueFields
        idPrefix="edit-person"
        description="Only the fields you change are saved."
        properties={props.properties}
        editor={form}
      />
    </PanelForm>
  );
}
