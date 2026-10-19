"use client";

import type { ReactNode } from "react";
import { Users } from "lucide-react";
import {
  DataTableEmpty,
  DataTableSurface,
  PagedTableFooter,
} from "@/components/table";
import {
  AudiencePeopleTestFilter,
  type AudienceIdentifierKind,
  type AudiencePerson,
  type AudienceProperty,
} from "@/lib/endatix-api/audience/types";
import { useUrlSearchParamsUpdater } from "@/lib/utils/hooks/use-url-search-params-updater.hook";
import { AddPersonPanel } from "../../create-person/ui/add-person-panel";
import { GenerateLinksPanel } from "../../generate-links/ui/generate-links-panel";
import { ImportCsvPanel } from "../../import-csv/ui/import-csv-panel";
import { RemovePersonDialog } from "../../delete-person/ui/remove-person-dialog";
import { useTestAsPerson } from "../../test-as-person/use-test-as-person.hook";
import { EditPersonPanel } from "../../update-person/ui/edit-person-panel";
import { useRowOverlay } from "../../use-panel-state.hook";
import { valueProperties } from "../../utils";
import { PeopleTable, type RowHandlers } from "./people-table";
import { PeopleTestFilter } from "./people-test-filter";
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
  /** With `forms.test` each row offers Test as this person. */
  canTest: boolean;
  /** All / Real / Test; `totalPeople` counts the filtered set. */
  testFilter: AudiencePeopleTestFilter;
  viewSwitch?: ReactNode;
  /** The locked match key, said once where people are listed. */
  matchKeyNote?: ReactNode;
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

type PeopleSurfaceProps = PeopleSectionProps & { handlers: RowHandlers };

const FILTERED_EMPTY: Record<string, { title: string; body: string }> = {
  [AudiencePeopleTestFilter.Real]: {
    title: "No real people",
    body: "Everyone on this form is a test person.",
  },
  [AudiencePeopleTestFilter.Test]: {
    title: "No test people",
    body: "Add a test person, or import people as test people, to try the form as them.",
  },
};

/** Nobody matches the Real or Test filter; Clear filters goes back to everyone. */
function FilteredEmpty({
  title,
  body,
}: Readonly<{ title: string; body: string }>) {
  const { updateUrl } = useUrlSearchParamsUpdater();
  return (
    <DataTableEmpty
      icon={Users}
      title={title}
      onClearFilters={() => updateUrl({ test: null, page: "1" })}
    >
      {body}
    </DataTableEmpty>
  );
}

function PeopleEmpty({
  testFilter,
}: Readonly<Pick<PeopleSectionProps, "testFilter">>) {
  const filtered = FILTERED_EMPTY[testFilter];
  if (filtered) return <FilteredEmpty {...filtered} />;
  return (
    <DataTableEmpty icon={Users} title="No people yet">
      Add the people this form is for, one at a time or from a CSV file. Each
      person can have their own value for every property.
    </DataTableEmpty>
  );
}

function PeopleSurface(props: Readonly<PeopleSurfaceProps>) {
  return (
    <DataTableSurface data-slot="audience-people-table">
      {props.totalPeople === 0 ? (
        <PeopleEmpty testFilter={props.testFilter} />
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
type OverlayProps = Pick<
  PeopleSectionProps,
  "formId" | "identifierKind" | "properties"
> & {
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
      <GenerateLinksPanel {...props} />
      <AddPersonPanel
        {...props}
        properties={valueProperties(props.properties, props.identifierKind)}
      />
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

/** Row actions this reader may run: edit and remove with `forms.edit`, test with `forms.test`. */
function useRowHandlers(
  props: Readonly<PeopleSectionProps>,
  row: Overlays,
): RowHandlers {
  const testAs = useTestAsPerson(props.formId);
  return {
    ...(props.canEdit ? { onEdit: row.edit, onRemove: row.remove } : {}),
    ...(props.canTest ? { onTest: testAs } : {}),
  };
}

/** The filter shows once there is someone to filter, and stays while a filter is on. */
function showsTestFilter({ totalPeople, testFilter }: PeopleSectionProps) {
  return totalPeople > 0 || testFilter !== AudiencePeopleTestFilter.All;
}

/** Import keeps every property as a target; the rest show and edit only value properties. */
export function PeopleSection(props: Readonly<PeopleSectionProps>) {
  const row = useRowOverlay<AudiencePerson>();
  const handlers = useRowHandlers(props, row);
  const values = {
    ...props,
    properties: valueProperties(props.properties, props.identifierKind),
  };
  return (
    <section aria-labelledby="audience-people" className="flex flex-col gap-4">
      <PeopleHeader {...props} />
      {showsTestFilter(props) ? (
        <PeopleTestFilter value={props.testFilter} />
      ) : null}
      <PeopleSurface {...values} handlers={handlers} />
      {props.canEdit ? <PeopleOverlays {...values} row={row} /> : null}
    </section>
  );
}
