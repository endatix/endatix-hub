"use client";

import { Columns3 } from "lucide-react";
import { PanelSection } from "@/components/common/panel-section";
import type {
  AudienceProperty,
  AudiencePropertyValues,
} from "@/lib/endatix-api/audience/types";
import { PropertyValueField } from "./property-value-field";

/** The editable values of one person, as the panels' hooks expose them. */
export type ValueEditor = {
  values: AudiencePropertyValues;
  setValue: (propertyId: string, value: string) => void;
  pending: boolean;
};

type ValueFieldListProps = {
  idPrefix: string;
  properties: AudienceProperty[];
  editor: ValueEditor;
};

function ValueFieldList({
  idPrefix,
  properties,
  editor,
}: Readonly<ValueFieldListProps>) {
  return properties.map((property) => (
    <PropertyValueField
      key={property.id}
      id={`${idPrefix}-${property.id}`}
      property={property}
      value={editor.values[property.id] ?? ""}
      disabled={editor.pending}
      onChange={(value) => editor.setValue(property.id, value)}
    />
  ));
}

/** The person's property values, one typed field per property, as one panel section. */
export function PersonValueFields({
  description,
  ...list
}: Readonly<ValueFieldListProps & { description: string }>) {
  if (list.properties.length === 0) return null;
  return (
    <PanelSection icon={Columns3} title="Properties" description={description}>
      <div className="grid gap-4">
        <ValueFieldList {...list} />
      </div>
    </PanelSection>
  );
}
