"use client";

import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import { ConfirmDeleteDialog } from "../../ui/confirm-delete-dialog";
import { deleteAudiencePropertyAction } from "../delete-audience-property.action";

type DeletePropertyDialogProps = {
  formId: string;
  property: AudienceProperty | null;
  open: boolean;
  totalPeople: number;
  onClose: () => void;
};

const COPY = Object.freeze({
  confirmLabel: "Delete property",
  pendingLabel: "Deleting…",
  successMessage: "Property deleted",
});

/** Says how many people lose a value, so the reader knows the size of the delete. */
export function valuesConsequence(totalPeople: number): string {
  if (totalPeople === 0)
    return "No one is on this audience yet, so no values are lost.";
  const people =
    totalPeople === 1 ? "1 person" : `${totalPeople.toLocaleString()} people`;
  return `Its values are deleted for all ${people} on this form's audience.`;
}

export function DeletePropertyDialog(
  props: Readonly<DeletePropertyDialogProps>,
) {
  const { formId, property, open, totalPeople, onClose } = props;
  const title = `Delete ${property?.name ?? "property"}?`;
  const action = () => deleteAudiencePropertyAction(formId, property?.id ?? "");
  return (
    <ConfirmDeleteDialog
      {...COPY}
      open={open && property !== null}
      title={title}
      action={action}
      onClose={onClose}
    >
      {valuesConsequence(totalPeople)} This can&apos;t be undone.
    </ConfirmDeleteDialog>
  );
}
