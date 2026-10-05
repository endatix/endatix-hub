"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  AudienceProperty,
  AudiencePropertyValues,
} from "@/lib/endatix-api/audience/types";
import { runCreatePerson } from "../audience-runs";

function emptyValues(properties: AudienceProperty[]): AudiencePropertyValues {
  const values: AudiencePropertyValues = {};
  for (const property of properties) values[property.id] = "";
  return values;
}

export function useAddPerson(formId: string, properties: AudienceProperty[]) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [identifier, setIdentifier] = useState("");
  const [values, setValues] = useState(() => emptyValues(properties));
  const setValue = (propertyId: string, value: string) =>
    setValues((current) => ({ ...current, [propertyId]: value }));

  function create(): void {
    startTransition(async () => {
      if (!(await runCreatePerson(formId, identifier, values))) return;
      setIdentifier("");
      setValues(emptyValues(properties));
      router.refresh();
    });
  }

  return { pending, identifier, setIdentifier, values, setValue, create };
}
