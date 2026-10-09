"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanelForm } from "@/components/common/panel-form";
import { useCreateProperty } from "../use-create-property.hook";
import { PropertyFields } from "./property-fields";

/** Outline, not primary: on this page the main action is adding people. */
const PANEL = Object.freeze({
  title: "Add property",
  description:
    "A column on this form's audience. Each person can have one value for it.",
  errorTitle: "Property not added",
  submitLabel: "Add property",
  pendingLabel: "Adding…",
  desktopType: "simple",
  trigger: (
    <Button variant="outline">
      <Plus />
      Add property
    </Button>
  ),
} as const);

export function AddPropertyPanel({ formId }: Readonly<{ formId: string }>) {
  const form = useCreateProperty(formId);
  return (
    <PanelForm
      {...form}
      {...PANEL}
      onOpenChange={form.openChange}
      submitDisabled={!form.variableName}
      onSubmit={form.submit}
    >
      <PropertyFields form={form} />
    </PanelForm>
  );
}
