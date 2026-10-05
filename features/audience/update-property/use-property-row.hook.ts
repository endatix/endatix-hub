"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import { runDeleteProperty, runRenameProperty } from "../audience-runs";

function useNameEditor(savedName: string) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(savedName);
  const cancel = () => {
    setEditName(savedName);
    setEditing(false);
  };
  return { editing, setEditing, editName, setEditName, cancel };
}

export function usePropertyRow(formId: string, property: AudienceProperty) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editor = useNameEditor(property.name);

  const rename = () =>
    startTransition(async () => {
      if (!(await runRenameProperty(formId, property.id, editor.editName))) return;
      editor.setEditing(false);
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      if (await runDeleteProperty(formId, property.id)) router.refresh();
    });

  return { ...editor, pending, rename, remove };
}
