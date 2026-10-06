"use client";

import { useState } from "react";
import { useAudienceMutation } from "../use-audience-mutation.hook";
import { usePanelOpen, useValueMap } from "../use-panel-state.hook";
import { createAudiencePersonAction } from "./create-audience-person.action";

/** The new person being typed: identifier and optional values. */
function usePersonDraft() {
  const [identifier, setIdentifier] = useState("");
  const values = useValueMap();
  const reset = () => {
    setIdentifier("");
    values.reset();
  };
  return { ...values, identifier, setIdentifier, reset };
}

/** State for the Add person panel; reopening it starts from an empty form. */
export function useAddPerson(formId: string) {
  const draft = usePersonDraft();
  const { run, clearError, status } = useAudienceMutation();
  const panel = usePanelOpen(() => {
    draft.reset();
    clearError();
  }, status.pending);
  const { identifier, values } = draft;
  const action = () =>
    createAudiencePersonAction({ formId, identifier, values });
  const submit = () =>
    run({ action, successMessage: "Person added", onSuccess: panel.close });
  return { ...draft, ...panel, ...status, submit };
}
