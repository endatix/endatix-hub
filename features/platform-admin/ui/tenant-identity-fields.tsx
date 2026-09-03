"use client";

import { PanelSection } from "@/components/common/panel-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2 } from "lucide-react";

interface TenantIdentityFieldsProps {
  idPrefix: string;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  error?: string | null;
}

export function TenantIdentityFields({
  idPrefix,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  error = null,
}: Readonly<TenantIdentityFieldsProps>) {
  const nameId = `${idPrefix}-name`;
  const descriptionId = `${idPrefix}-description`;
  const errorId = `${idPrefix}-name-error`;

  return (
    <PanelSection
      icon={Building2}
      title="Identity"
      description="How this tenant is labelled across the Hub."
    >
      <div className="grid gap-2">
        <Label htmlFor={nameId}>Name</Label>
        <Input
          id={nameId}
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        {error && (
          <p id={errorId} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={descriptionId}>Description</Label>
        <Textarea
          id={descriptionId}
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Optional. Shown next to the tenant name in the platform list.
        </p>
      </div>
    </PanelSection>
  );
}
