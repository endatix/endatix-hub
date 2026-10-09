"use client";

import { Columns3 } from "lucide-react";
import { DataTableEmpty, DataTableSurface } from "@/components/table";
import type { AudienceProperty } from "@/lib/endatix-api/audience/types";
import { AddPropertyPanel } from "../../create-property/ui/add-property-panel";
import { DeletePropertyDialog } from "../../delete-property/ui/delete-property-dialog";
import { RenamePropertyPanel } from "../../update-property/ui/rename-property-panel";
import { useRowOverlay } from "../../use-panel-state.hook";
import { PropertiesTable } from "./properties-table";
import { SectionHeader } from "./section-header";

type PropertiesSectionProps = {
  formId: string;
  properties: AudienceProperty[];
  totalPeople: number;
};

type RowTargets = {
  onRename: (property: AudienceProperty) => void;
  onDelete: (property: AudienceProperty) => void;
};

const DESCRIPTION =
  "The facts kept for each person on this form, such as a department or a plan. Each one is a column in the people table.";

function PropertiesSurface({
  properties,
  ...targets
}: Readonly<RowTargets & { properties: AudienceProperty[] }>) {
  return (
    <DataTableSurface data-slot="audience-properties-table">
      {properties.length === 0 ? (
        <DataTableEmpty icon={Columns3} title="No properties yet">
          Add a property for each fact you want to keep per person.
        </DataTableEmpty>
      ) : (
        <PropertiesTable properties={properties} {...targets} />
      )}
    </DataTableSurface>
  );
}

type Overlays = ReturnType<typeof useRowOverlay<AudienceProperty>>;
type OverlayProps = PropertiesSectionProps & { row: Overlays };

/** One overlay at a time: the row's rename panel or its delete confirmation. */
function PropertyOverlays({ row, ...props }: Readonly<OverlayProps>) {
  const renameKey = row.editing?.id ?? "closed";
  return (
    <>
      <RenamePropertyPanel
        key={renameKey}
        {...props}
        property={row.editing}
        onClose={row.close}
      />
      <DeletePropertyDialog
        {...props}
        property={row.deleting}
        onClose={row.close}
      />
    </>
  );
}

function PropertiesHeader({ formId }: Readonly<{ formId: string }>) {
  const action = <AddPropertyPanel formId={formId} />;
  return (
    <SectionHeader
      id="audience-properties"
      title="Properties"
      description={DESCRIPTION}
      action={action}
    />
  );
}

export function PropertiesSection(props: Readonly<PropertiesSectionProps>) {
  const row = useRowOverlay<AudienceProperty>();
  const surface = {
    properties: props.properties,
    onRename: row.edit,
    onDelete: row.remove,
  };
  return (
    <section
      aria-labelledby="audience-properties"
      className="flex flex-col gap-4"
    >
      <PropertiesHeader formId={props.formId} />
      <PropertiesSurface {...surface} />
      <PropertyOverlays {...props} row={row} />
    </section>
  );
}
