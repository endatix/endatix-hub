"use client";

import { useState } from "react";
import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import { useAudienceMutation } from "../use-audience-mutation.hook";
import { updateAudiencePropertyAction } from "./update-audience-property.action";

type RenameTarget = {
  formId: string;
  property: AudienceProperty | null;
  onDone: () => void;
};

/** Rename panel state; the panel is keyed by property, so the name starts from the saved one. */
export function useRenameProperty({ formId, property, onDone }: RenameTarget) {
  const [name, setName] = useState(property?.name ?? "");
  const { run, status } = useAudienceMutation();
  const submit = () => {
    if (!property || name.trim() === property.name) return onDone();
    const propertyId = property.id;
    run({
      action: () => updateAudiencePropertyAction({ formId, propertyId, name }),
      successMessage: "Property renamed",
      onSuccess: onDone,
    });
  };
  return { name, setName, ...status, submit };
}
