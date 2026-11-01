"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  DATA_TABLE_SHRINK_WRAP_CLASS_NAME as SHRINK,
  dataTableCell,
  type StaticDataTableCell,
  type StaticDataTableColumn,
} from "@/components/table";
import type { AudiencePerson } from "@/lib/endatix-api/audience/types";
import { NotSet } from "../../ui/not-set";
import type { ParticipantSelection } from "../../ui/use-participant-selection.hook";

/** Test participants only: test links are made for them alone. */
const selectableIds = (people: readonly AudiencePerson[]) =>
  people.filter((p) => p.isTest).map((p) => p.membershipId);

function pageState(selection: ParticipantSelection, ids: string[]) {
  const ticked = ids.filter((id) => selection.isSelected(id)).length;
  if (ticked === 0) return false;
  return ticked === ids.length ? true : "indeterminate";
}

type PageCheckboxProps = {
  people: readonly AudiencePerson[];
  selection: ParticipantSelection;
};

/** Ticks every test participant on this page, or clears them when all are ticked. */
function SelectPage({ people, selection }: Readonly<PageCheckboxProps>) {
  const ids = selectableIds(people);
  const state = pageState(selection, ids);
  return (
    <Checkbox
      aria-label="Select test participants on this page"
      checked={state}
      disabled={ids.length === 0}
      onCheckedChange={() => selection.setSelected(ids, state !== true)}
    />
  );
}

export function selectColumn(
  props: Readonly<PageCheckboxProps>,
): StaticDataTableColumn {
  return {
    key: "select",
    label: "Select",
    className: SHRINK,
    header: <SelectPage {...props} />,
  };
}

const NO_TICK = (
  <NotSet label="No tick: only test participants get test links" />
);

export function selectCell(
  person: AudiencePerson,
  selection: ParticipantSelection,
): StaticDataTableCell {
  const id = person.membershipId;
  const box = person.isTest ? (
    <Checkbox
      aria-label={`Select ${person.identifier}`}
      checked={selection.isSelected(id)}
      onCheckedChange={(checked) =>
        selection.setSelected([id], checked === true)
      }
    />
  ) : (
    NO_TICK
  );
  return dataTableCell("select", box, SHRINK);
}
