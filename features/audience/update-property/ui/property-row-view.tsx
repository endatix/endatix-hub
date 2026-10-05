"use client";

import { Button } from "@/components/ui/button";
import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import { dataTypeLabel } from "../../utils";
import { Pencil, Trash2 } from "lucide-react";

type Props = {
  property: AudienceProperty;
  pending: boolean;
  onRename: () => void;
  onDelete: () => void;
};

export function PropertyRowView({ property, pending, onRename, onDelete }: Readonly<Props>) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{property.name}</p>
        <p className="text-xs text-muted-foreground">
          {property.variableName} · {dataTypeLabel(property.dataType)}
        </p>
      </div>
      <Button size="icon" variant="ghost" onClick={onRename} disabled={pending} aria-label={`Rename ${property.name}`}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button size="icon" variant="ghost" onClick={onDelete} disabled={pending} aria-label={`Delete ${property.name}`}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </li>
  );
}
