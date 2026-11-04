"use client";

import { useState } from "react";
import { useAudienceMutation } from "../use-audience-mutation.hook";
import { usePanelOpen, useValueMap } from "../use-panel-state.hook";
import { createAudiencePersonAction } from "./create-audience-person.action";

/** The new person being typed: identifier, optional values, and whether they are a test person. */
function usePersonDraft() {
  const [identifier, setIdentifier] = useState("");
  const [isTest, setIsTest] = useState(false);
  const values = useValueMap();
  const reset = () => {
    setIdentifier("");
    setIsTest(false);
    values.reset();
  };
  return { ...values, identifier, setIdentifier, isTest, setIsTest, reset };
}

/** State for the Add person panel; reopening it starts from an empty form. */
export function useAddPerson(formId: string) {
  const draft = usePersonDraft();
  const { run, clearError, status } = useAudienceMutation();
  const panel = usePanelOpen(() => {
    draft.reset();
    clearError();
  }, status.pending);
  const { identifier, values, isTest } = draft;
  const action = () =>
    createAudiencePersonAction({ formId, identifier, values, isTest });
  const successMessage = isTest
    ? "Test participant added"
    : "Participant added";
  const submit = () => run({ action, successMessage, onSuccess: panel.close });
  return { ...draft, ...panel, ...status, submit };
}
