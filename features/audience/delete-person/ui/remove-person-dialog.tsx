"use client";

import type { AudiencePerson } from "@/lib/endatix-api/audience/types";
import { ConfirmDeleteDialog } from "../../ui/confirm-delete-dialog";
import { deleteAudiencePersonAction } from "../delete-audience-person.action";

type RemovePersonDialogProps = {
  formId: string;
  person: AudiencePerson | null;
  onClose: () => void;
};

const CONSEQUENCE =
  "Their values on this form are deleted. They stay on the audience of any other form they are on.";

const COPY = Object.freeze({
  confirmLabel: "Remove",
  pendingLabel: "Removing…",
  successMessage: "Person removed from this form",
});

export function RemovePersonDialog({
  formId,
  person,
  onClose,
}: Readonly<RemovePersonDialogProps>) {
  const title = `Remove ${person?.identifier ?? "person"} from this form?`;
  const action = () =>
    deleteAudiencePersonAction(formId, person?.membershipId ?? "");
  return (
    <ConfirmDeleteDialog
      {...COPY}
      open={person !== null}
      title={title}
      action={action}
      onClose={onClose}
    >
      {CONSEQUENCE}
    </ConfirmDeleteDialog>
  );
}
