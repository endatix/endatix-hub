"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import { runDeleteProperty, runRenameProperty } from "./audience-runs";

export function usePropertyRow(formId: string, property: AudienceProperty) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(property.name);

  const rename = () =>
    startTransition(async () => {
      if (!(await runRenameProperty(formId, property.id, editName))) return;
      setEditing(false);
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      if (await runDeleteProperty(formId, property.id)) router.refresh();
    });

  return { pending, editing, editName, setEditName, setEditing, rename, remove };
}
