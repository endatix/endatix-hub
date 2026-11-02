"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { AudiencePerson } from "@/lib/endatix-api/audience/types";
import { cn } from "@/lib/utils";
import { WithTestBadge } from "../../ui/test-badge";

export type PickerGroup = {
  label: string;
  people: AudiencePerson[];
  /** Said under the group when it shows fewer than it has, or nobody. */
  note?: string;
};

type ParticipantPickerProps = {
  groups: PickerGroup[];
  search: string;
  selectedId?: string;
  onSelect: (memberId: string) => void;
  onSearch: (search: string) => void;
};

const STEP: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 };
const JUMP: Record<string, (ids: string[]) => string | undefined> = {
  Home: (ids) => ids[0],
  End: (ids) => ids.at(-1),
};
const isListKey = (key: string) => key in STEP || key in JUMP;

function stepFrom(ids: string[], selectedId: string | undefined, key: string) {
  if (key in JUMP) return JUMP[key](ids);
  const step = STEP[key];
  const at = selectedId ? ids.indexOf(selectedId) : -1;
  if (at === -1) return step > 0 ? ids[0] : undefined;
  return ids[at + step];
}

const SEARCH_ICON =
  "pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground";
const LIST = "flex flex-col gap-4 rounded-xl border bg-card p-2";
const OPTION =
  "w-full rounded-md px-2 py-1.5 text-left text-sm break-all hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

type SearchFieldProps = Pick<ParticipantPickerProps, "search" | "onSearch">;

function SearchField({ search, onSearch }: Readonly<SearchFieldProps>) {
  const [query, setQuery] = useState(search);
  const submit = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    onSearch(query);
  };
  return (
    <form role="search" className="relative" onSubmit={submit}>
      <Search aria-hidden="true" className={SEARCH_ICON} />
      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Find a participant"
        placeholder="Find any participant"
        className="pl-8"
      />
    </form>
  );
}

type ListProps = ParticipantPickerProps & {
  optionId: (memberId: string) => string;
  /** The one option in the tab order: the selected one, else the first. */
  tabbableId?: string;
  onKeyDown: (event: KeyboardEvent, memberId: string) => void;
};

type GroupProps = ListProps & { group: PickerGroup };

function GroupOptions(props: Readonly<GroupProps>) {
  const { group, optionId, selectedId, tabbableId, onSelect } = props;
  return group.people.map(({ audienceMemberId: id, identifier, isTest }) => (
    <li key={id}>
      <button
        type="button"
        id={optionId(id)}
        aria-current={id === selectedId ? "true" : undefined}
        tabIndex={id === tabbableId ? 0 : -1}
        onClick={() => onSelect(id)}
        onKeyDown={(event) => props.onKeyDown(event, id)}
        className={cn(OPTION, id === selectedId && "bg-muted font-medium")}
      >
        <WithTestBadge isTest={isTest}>{identifier}</WithTestBadge>
      </button>
    </li>
  ));
}

function Group(props: Readonly<GroupProps>) {
  const { label, note } = props.group;
  const heading = useId();
  return (
    <div>
      <p
        id={heading}
        className="px-2 pb-1 text-xs font-medium text-muted-foreground"
      >
        {label}
      </p>
      <ul aria-labelledby={heading}>
        <GroupOptions {...props} />
      </ul>
      {note ? (
        <p className="px-2 pt-1 text-xs text-muted-foreground">{note}</p>
      ) : null}
    </div>
  );
}

function useScrollIntoView(id: string | undefined) {
  useEffect(() => {
    if (id) document.getElementById(id)?.scrollIntoView?.({ block: "nearest" });
  }, [id]);
}

/** Arrow keys, Home and End move focus and the selection to another participant. */
function useListKeys(
  ids: string[],
  props: ParticipantPickerProps,
  optionId: (id: string) => string,
) {
  const { selectedId, onSelect } = props;
  const listed =
    selectedId && ids.includes(selectedId) ? selectedId : undefined;
  useScrollIntoView(listed && optionId(listed));
  const onKeyDown = (event: KeyboardEvent, from: string) => {
    if (!isListKey(event.key)) return;
    event.preventDefault();
    const next = stepFrom(ids, from, event.key);
    if (!next || next === from) return;
    document.getElementById(optionId(next))?.focus();
    onSelect(next);
  };
  return { tabbableId: listed ?? ids[0], onKeyDown };
}

/**
 * Test participants, then everyone a search finds: a click or a key previews another one.
 */
export function ParticipantPicker(props: Readonly<ParticipantPickerProps>) {
  const base = useId();
  const optionId = (memberId: string) => `${base}-${memberId}`;
  const ids = props.groups.flatMap((g) =>
    g.people.map((p) => p.audienceMemberId),
  );
  const list = { ...props, ...useListKeys(ids, props, optionId), optionId };
  return (
    <div className="flex flex-col gap-3">
      <SearchField {...props} />
      <section aria-label="Participants" className={LIST}>
        {props.groups.map((group) => (
          <Group key={group.label} {...list} group={group} />
        ))}
      </section>
    </div>
  );
}
