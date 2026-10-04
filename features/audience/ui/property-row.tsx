"use client";

import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import { PropertyRowEdit } from "./property-row-edit";
import { PropertyRowView } from "./property-row-view";
import { usePropertyRow } from "./use-property-row";

type Props = { formId: string; property: AudienceProperty };

export function PropertyRow({ formId, property }: Readonly<Props>) {
  const row = usePropertyRow(formId, property);
  return row.editing ? (
    <PropertyRowEdit
      editName={row.editName}
      pending={row.pending}
      onEditNameChange={row.setEditName}
      onSave={row.rename}
      onCancel={row.cancel}
    />
  ) : (
    <PropertyRowView
      property={property}
      pending={row.pending}
      onRename={() => row.setEditing(true)}
      onDelete={row.remove}
    />
  );
}
