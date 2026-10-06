"use client";

import type { AudiencePerson } from "@/lib/endatix-api/audience/types";
import { useAudienceMutation } from "../use-audience-mutation.hook";
import { useValueMap } from "../use-panel-state.hook";
import { changedValues } from "../utils";
import { updateAudiencePersonAction } from "./update-audience-person.action";

type EditTarget = {
  formId: string;
  person: AudiencePerson | null;
  onDone: () => void;
};

/**
 * Edit panel state for one person; the panel is keyed by person, so state starts from their
 * values. Saves only what changed, so a value another editor saved meanwhile is not
 * overwritten with the one this panel loaded.
 */
export function useEditPerson({ formId, person, onDone }: EditTarget) {
  const editor = useValueMap({ ...person?.values });
  const { run, status } = useAudienceMutation();
  const submit = () => {
    const values = person ? changedValues(person.values, editor.values) : {};
    if (!person || Object.keys(values).length === 0) return onDone();
    const membershipId = person.membershipId;
    run({
      action: () =>
        updateAudiencePersonAction({ formId, membershipId, values }),
      successMessage: "Person updated",
      onSuccess: onDone,
    });
  };
  return { ...editor, ...status, submit };
}
