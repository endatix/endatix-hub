"use client";

import { useState } from "react";
import { AudienceDataType } from "@/lib/endatix-api/audience/types";
import { useAudienceMutation } from "../use-audience-mutation.hook";
import { usePanelOpen } from "../use-panel-state.hook";
import { variableNameFromName } from "../property-types";
import {
  choicesError,
  choicesFromText,
  isChoiceType,
  toCreateInput,
} from "../property-draft";
import { createAudiencePropertyAction } from "./create-audience-property.action";

/** The choices a choice type needs, as typed, and why the API would refuse them. */
function useChoicesDraft() {
  const [choicesText, setChoicesText] = useState("");
  const [allowsOther, setAllowsOther] = useState(false);
  const choices = choicesFromText(choicesText);
  const reset = () => {
    setChoicesText("");
    setAllowsOther(false);
  };
  return {
    choicesText,
    setChoicesText,
    allowsOther,
    setAllowsOther,
    choices,
    choicesError: choicesError(choices),
    reset,
  };
}

/** The new property being typed, with the variable name it would get. */
function usePropertyDraft() {
  const [name, setName] = useState("");
  const [dataType, setDataType] = useState<AudienceDataType>(
    AudienceDataType.Text,
  );
  const choices = useChoicesDraft();
  const reset = () => {
    setName("");
    setDataType(AudienceDataType.Text);
    choices.reset();
  };
  const variableName = variableNameFromName(name);
  const isChoice = isChoiceType(dataType);
  return {
    ...choices,
    name,
    setName,
    dataType,
    setDataType,
    isChoice,
    variableName,
    ready: Boolean(variableName) && !(isChoice && choices.choicesError),
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
  const submit = () =>
    run({
      action: () => createAudiencePropertyAction(toCreateInput(formId, draft)),
      successMessage: "Property added",
      onSuccess: panel.close,
    });
  return { ...draft, ...panel, ...status, submit };
}
