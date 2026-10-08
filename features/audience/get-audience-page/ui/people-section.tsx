"use client";

import type { ReactNode } from "react";
import { Users } from "lucide-react";
import {
  DataTableEmpty,
  DataTableSurface,
  PagedTableFooter,
} from "@/components/table";
import type {
  AudienceIdentifierKind,
  AudiencePerson,
  AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { useUrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { AddPersonPanel } from "../../create-person/ui/add-person-panel";
import { GenerateLinksPanel } from "../../generate-links/ui/generate-links-panel";
import { ImportCsvPanel } from "../../import-csv/ui/import-csv-panel";
import { RemovePersonDialog } from "../../delete-person/ui/remove-person-dialog";
import { EditPersonPanel } from "../../update-person/ui/edit-person-panel";
import { useRowOverlay } from "../../use-panel-state.hook";
import { PeopleTable } from "./people-table";
import { SectionHeader } from "./section-header";

type PeopleSectionProps = {
  formId: string;
  identifierKind: AudienceIdentifierKind;
  properties: AudienceProperty[];
  people: AudiencePerson[];
  totalPeople: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  /** Without `forms.edit` the list is read-only: no add, edit or remove controls. */
  canEdit: boolean;
  viewSwitch?: ReactNode;
  /** The locked match key, said once where people are listed. */
  matchKeyNote?: ReactNode;
};

type RowTargets = {
  onEdit: (person: AudiencePerson) => void;
  onRemove: (person: AudiencePerson) => void;
};
type Paging = Pick<
  PeopleSectionProps,
  "page" | "pageSize" | "totalPeople" | "totalPages" | "hasNextPage"
>;

/** Paging as the API returned it; the footer never recomputes it. */
function pagerState({ totalPeople, ...paging }: Paging) {
  return { ...paging, totalRecords: totalPeople };
}

function PeoplePager(props: Readonly<Paging>) {
  const { updateUrl } = useUrlSearchParamsUpdater();
  return (
    <PagedTableFooter
      variant="surface"
      entityLabel="people"
      {...pagerState(props)}
      onPageChange={(next) => updateUrl({ page: String(next) })}
      onPageSizeChange={(size) =>
        updateUrl({ pageSize: String(size), page: "1" })
      }
    />
  );
}

type PeopleSurfaceProps = PeopleSectionProps & { handlers?: RowTargets };

function PeopleSurface(props: Readonly<PeopleSurfaceProps>) {
  return (
    <DataTableSurface data-slot="audience-people-table">
      {props.totalPeople === 0 ? (
        <DataTableEmpty icon={Users} title="No people yet">
          Add the people this form is for, one at a time or from a CSV file.
          Each person can have their own value for every property.
        </DataTableEmpty>
      ) : (
        <>
          <PeopleTable {...props} />
          <PeoplePager {...props} />
        </>
      )}
    </DataTableSurface>
  );
}

type Overlays = ReturnType<typeof useRowOverlay<AudiencePerson>>;
type OverlayProps = Pick<PeopleSectionProps, "formId" | "properties"> & {
  row: Overlays;
};

/** One overlay at a time: the row's edit panel or its remove confirmation. */
function PeopleOverlays({ row, ...props }: Readonly<OverlayProps>) {
  return (
    <>
      <EditPersonPanel
        key={row.session}
        {...props}
        person={row.target}
        open={row.isEditing}
        onClose={row.close}
      />
      <RemovePersonDialog
        {...props}
        person={row.target}
        open={row.isDeleting}
        onClose={row.close}
      />
    </>
  );
}

const DESCRIPTION =
  "Who this form is for. Removing someone takes them off this form only.";

/** Import is `outline` beside the view's one primary action, Add person (DESIGN.md §5 Buttons). */
function PeopleActions(props: Readonly<PeopleSectionProps>) {
  if (!props.canEdit) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <ImportCsvPanel {...props} />
      <GenerateLinksPanel formId={props.formId} />
      <AddPersonPanel {...props} />
    </div>
  );
}

function PeopleHeader(props: Readonly<PeopleSectionProps>) {
  return (
    <SectionHeader
      id="audience-people"
      title="People"
      description={
        <>
          {DESCRIPTION} {props.matchKeyNote}
        </>
      }
      viewSwitch={props.viewSwitch}
      action={<PeopleActions {...props} />}
    />
  );
}

export function PeopleSection(props: Readonly<PeopleSectionProps>) {
  const row = useRowOverlay<AudiencePerson>();
  const handlers = props.canEdit
    ? { onEdit: row.edit, onRemove: row.remove }
    : undefined;
  return (
    <section aria-labelledby="audience-people" className="flex flex-col gap-4">
      <PeopleHeader {...props} />
      <PeopleSurface {...props} handlers={handlers} />
      {props.canEdit ? <PeopleOverlays {...props} row={row} /> : null}
    </section>
  );
}
