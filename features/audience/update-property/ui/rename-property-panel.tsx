"use client";

import { Columns3 } from "lucide-react";
import { PanelSection } from "@/components/common/panel-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import { PanelForm } from "@/components/common/panel-form";
import { useRenameProperty } from "../use-rename-property.hook";
import { LockedPropertyFacts } from "./locked-property-facts";

type RenamePropertyPanelProps = {
  formId: string;
  property: AudienceProperty | null;
  onClose: () => void;
};
type NameEditor = {
  name: string;
  setName: (value: string) => void;
  pending: boolean;
};

const NAME_ID = "rename-property-name";

function panelProps({ property, onClose }: RenamePropertyPanelProps) {
  return {
    open: property !== null,
    onOpenChange: (open: boolean) => !open && onClose(),
    title: "Rename property",
    description:
      "Changes the label shown in the Hub. Surveys and exports keep using the variable name.",
    errorTitle: "Property not renamed",
    submitLabel: "Save name",
    pendingLabel: "Saving…",
    desktopType: "simple" as const,
  };
}

function NameInput({ form }: Readonly<{ form: NameEditor }>) {
  const input = {
    id: NAME_ID,
    value: form.name,
    maxLength: 100,
    disabled: form.pending,
    autoComplete: "off",
  };
  return (
    <div className="grid gap-2">
      <Label htmlFor={NAME_ID}>Name</Label>
      <Input
        {...input}
        onChange={(event) => form.setName(event.target.value)}
      />
    </div>
  );
}

type RenameFieldsProps = {
  form: NameEditor;
  property: AudienceProperty | null;
};

function RenameFields({ form, property }: Readonly<RenameFieldsProps>) {
  return (
    <PanelSection icon={Columns3} title="Property">
      <div className="grid gap-4">
        <NameInput form={form} />
        {property ? <LockedPropertyFacts property={property} /> : null}
      </div>
    </PanelSection>
  );
}

/** Render it with `key` set to the property id so each property opens fresh. */
export function RenamePropertyPanel(props: Readonly<RenamePropertyPanelProps>) {
  const { formId, property, onClose: onDone } = props;
  const form = useRenameProperty({ formId, property, onDone });
  return (
    <PanelForm
      {...form}
      {...panelProps(props)}
      submitDisabled={!form.name.trim()}
      onSubmit={form.submit}
    >
      <RenameFields form={form} property={property} />
    </PanelForm>
  );
}
