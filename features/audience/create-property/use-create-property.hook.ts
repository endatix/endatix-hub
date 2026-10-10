"use client";

import { useState } from "react";
import { AudienceDataType } from "@/lib/endatix-api/audience/types";
import { useAudienceMutation } from "../use-audience-mutation.hook";
import { usePanelOpen } from "../use-panel-state.hook";
import { variableNameFromName } from "../property-types";
import { createAudiencePropertyAction } from "./create-audience-property.action";

/** The new property being typed, with the variable name it would get. */
function usePropertyDraft() {
  const [name, setName] = useState("");
  const [dataType, setDataType] = useState<AudienceDataType>(
    AudienceDataType.Text,
  );
  const reset = () => {
    setName("");
    setDataType(AudienceDataType.Text);
  };
  return {
    name,
    setName,
    dataType,
    setDataType,
    variableName: variableNameFromName(name),
    reset,
  };
}

/** State for the Add property panel; reopening it starts from an empty form. */
export function useCreateProperty(formId: string) {
  const draft = usePropertyDraft();
  const { run, clearError, status } = useAudienceMutation();
  const reset = () => {
    draft.reset();
    clearError();
  };
  const panel = usePanelOpen(reset, status.pending);
  const { name, dataType } = draft;
  const submit = () =>
    run({
      action: () => createAudiencePropertyAction({ formId, name, dataType }),
      successMessage: "Property added",
      onSuccess: panel.close,
    });
  return { ...draft, ...panel, ...status, submit };
}
