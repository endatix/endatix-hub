"use client";

import type { Route } from "next";
import type { AudiencePerson } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { ConfirmDeleteDialog } from "../../ui/confirm-delete-dialog";
import { deleteAudiencePersonAction } from "../delete-audience-person.action";

type RemovePersonDialogProps = {
  formId: string;
  person: AudiencePerson | null;
  open: boolean;
  onClose: () => void;
  /** Opened from the participant's own page: go here once they are removed. */
  afterRemove?: Route;
  /** Runs once they are removed, for a list that ticks participants. */
  onRemoved?: (person: AudiencePerson) => void;
};

const CONSEQUENCE =
  "Their values on this form are deleted. They stay on any other form they are on.";

const COPY = Object.freeze({
  confirmLabel: "Remove",
  pendingLabel: "Removing…",
  successMessage: "Participant removed from this form",
});

async function removeAndTell(
  formId: string,
  person: AudiencePerson | null,
  onRemoved?: (person: AudiencePerson) => void,
) {
  const removed = await deleteAudiencePersonAction(
    formId,
    person?.membershipId ?? "",
  );
  if (person && Result.isSuccess(removed)) onRemoved?.(person);
  return removed;
}

export function RemovePersonDialog(props: Readonly<RemovePersonDialogProps>) {
  const { formId, person, open, onClose } = props;
  const title = `Remove ${person?.identifier ?? "this participant"} from this form?`;
  const action = () => removeAndTell(formId, person, props.onRemoved);
  return (
    <ConfirmDeleteDialog
      {...COPY}
      open={open && person !== null}
      title={title}
      action={action}
      onClose={onClose}
      afterDelete={props.afterRemove}
    >
      {CONSEQUENCE}
    </ConfirmDeleteDialog>
  );
}
