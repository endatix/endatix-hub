"use client";

import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import { PropertyCreateForm } from "../../create-property/ui/property-create-form";
import { PropertyRow } from "../../update-property/ui/property-row";

type PropertiesSectionProps = {
  formId: string;
  properties: AudienceProperty[];
};

function PropertiesList({
  formId,
  properties,
}: Readonly<PropertiesSectionProps>) {
  if (properties.length === 0) {
    return <p className="text-sm text-muted-foreground">No properties yet.</p>;
  }

  return (
    <ul className="divide-y rounded-md border">
      {properties.map((property) => (
        <PropertyRow key={property.id} formId={formId} property={property} />
      ))}
    </ul>
  );
}

export function PropertiesSection({
  formId,
  properties,
}: Readonly<PropertiesSectionProps>) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Properties</h2>
        <p className="text-sm text-muted-foreground">
          Columns on this form&apos;s audience. Variable names are set at create
          and never change.
        </p>
      </div>
      <PropertyCreateForm formId={formId} />
      <PropertiesList formId={formId} properties={properties} />
    </section>
  );
}
