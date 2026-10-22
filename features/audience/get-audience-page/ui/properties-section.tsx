"use client";

import type { ReactNode } from "react";
import { Columns3 } from "lucide-react";
import { DataTableEmpty, DataTableSurface } from "@/components/table";
import type {
  AudienceIdentifierKind,
  AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { AddPropertyPanel } from "../../create-property/ui/add-property-panel";
import { DeletePropertyDialog } from "../../delete-property/ui/delete-property-dialog";
import { RenamePropertyPanel } from "../../update-property/ui/rename-property-panel";
import { useRowOverlay } from "../../use-panel-state.hook";
import { PropertiesTable } from "./properties-table";
import { SectionHeader } from "./section-header";
import type { AudienceReview } from "@/lib/personalization/authoring";

type PropertiesSectionProps = {
  formId: string;
  identifierKind: AudienceIdentifierKind;
  properties: AudienceProperty[];
  totalPeople: number;
  /** Without `forms.edit` the list is read-only: no add, rename or delete controls. */
  canEdit: boolean;
  viewSwitch?: ReactNode;
  /** The saved form's Audience review, for the coverage columns. */
  review?: AudienceReview | null;
};

type RowTargets = {
  onRename: (property: AudienceProperty) => void;
  onDelete: (property: AudienceProperty) => void;
};

const DESCRIPTION =
  "The facts kept for each person on this form, such as a department or a plan. Each one is a column in the people table.";

type SurfaceProps = Pick<
  PropertiesSectionProps,
  "identifierKind" | "properties" | "review"
> & { targets?: RowTargets };

function PropertiesSurface({ targets, ...table }: Readonly<SurfaceProps>) {
  return (
    <DataTableSurface data-slot="audience-properties-table">
      {table.properties.length === 0 ? (
        <DataTableEmpty icon={Columns3} title="No properties yet">
          Add a property for each fact you want to keep per person.
        </DataTableEmpty>
      ) : (
        <PropertiesTable {...table} handlers={targets} />
      )}
    </DataTableSurface>
  );
}

type Overlays = ReturnType<typeof useRowOverlay<AudienceProperty>>;
type OverlayProps = PropertiesSectionProps & { row: Overlays };

/** One overlay at a time: the row's rename panel or its delete confirmation. */
function PropertyOverlays({ row, ...props }: Readonly<OverlayProps>) {
  return (
    <>
      <RenamePropertyPanel
        key={row.session}
        {...props}
        property={row.target}
        open={row.isEditing}
        onClose={row.close}
      />
      <DeletePropertyDialog
        {...props}
        property={row.target}
        open={row.isDeleting}
        onClose={row.close}
      />
    </>
  );
}

type PropertiesHeaderProps = Pick<
  PropertiesSectionProps,
  "formId" | "viewSwitch" | "canEdit"
>;

function PropertiesHeader({
  formId,
  viewSwitch,
  canEdit,
}: Readonly<PropertiesHeaderProps>) {
  const action = canEdit ? <AddPropertyPanel formId={formId} /> : null;
  return (
    <SectionHeader
      id="audience-properties"
      title="Properties"
      description={DESCRIPTION}
      viewSwitch={viewSwitch}
      action={action}
    />
  );
}

export function PropertiesSection(props: Readonly<PropertiesSectionProps>) {
  const row = useRowOverlay<AudienceProperty>();
  const targets = props.canEdit
    ? { onRename: row.edit, onDelete: row.remove }
    : undefined;
  return (
    <section
      aria-labelledby="audience-properties"
      className="flex flex-col gap-4"
    >
      <PropertiesHeader {...props} />
      <PropertiesSurface {...props} targets={targets} />
      {props.canEdit ? <PropertyOverlays {...props} row={row} /> : null}
    </section>
  );
}
