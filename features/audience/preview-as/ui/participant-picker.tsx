"use client";

import {
  useEffect,
  useId,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
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

/** The member id a key moves to: one step with the arrows (none past either end), or an end. */
function stepFrom(ids: string[], selectedId: string | undefined, key: string) {
  if (key in JUMP) return JUMP[key](ids);
  const step = STEP[key];
  const at = selectedId ? ids.indexOf(selectedId) : -1;
  if (at === -1) return step > 0 ? ids[0] : undefined;
  return ids[at + step];
}

const SEARCH_ICON =
  "pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground";
const LISTBOX =
  "flex flex-col gap-4 rounded-xl border bg-card p-2 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";
const OPTION =
  "cursor-pointer rounded-md px-2 py-1.5 text-sm break-all hover:bg-muted";

type SearchFieldProps = Pick<ParticipantPickerProps, "search" | "onSearch">;

function SearchField({ search, onSearch }: Readonly<SearchFieldProps>) {
  const [query, setQuery] = useState(search);
  const submit = (event: FormEvent) => {
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

type OptionsProps = {
  group: PickerGroup;
  optionId: (memberId: string) => string;
  selectedId?: string;
  onSelect: (memberId: string) => void;
};

function GroupOptions({
  group,
  optionId,
  selectedId,
  onSelect,
}: Readonly<OptionsProps>) {
  return group.people.map(({ audienceMemberId: id, identifier, isTest }) => (
    <div
      key={id}
      id={optionId(id)}
      role="option"
      aria-selected={id === selectedId}
      onClick={() => onSelect(id)}
      className={cn(OPTION, id === selectedId && "bg-muted font-medium")}
    >
      <WithTestBadge isTest={isTest}>{identifier}</WithTestBadge>
    </div>
  ));
}

function Group(props: Readonly<OptionsProps>) {
  const { label, note } = props.group;
  return (
    <div role="group" aria-label={label}>
      <div
        role="presentation"
        className="px-2 pb-1 text-xs font-medium text-muted-foreground"
      >
        {label}
      </div>
      <GroupOptions {...props} />
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

/** Arrow keys, Home and End select another option; the selected one is scrolled into view. */
function useListKeys(ids: string[], props: ListProps) {
  const { selectedId, onSelect, optionId } = props;
  const activeOption =
    selectedId && ids.includes(selectedId) ? optionId(selectedId) : undefined;
  useScrollIntoView(activeOption);
  const onKeyDown = (event: KeyboardEvent) => {
    if (!isListKey(event.key)) return;
    event.preventDefault();
    const next = stepFrom(ids, selectedId, event.key);
    if (next && next !== selectedId) onSelect(next);
  };
  return { activeOption, onKeyDown };
}

type ListProps = ParticipantPickerProps & {
  optionId: (memberId: string) => string;
};

function OptionList(props: Readonly<ListProps>) {
  const ids = props.groups.flatMap((g) =>
    g.people.map((p) => p.audienceMemberId),
  );
  const { activeOption, onKeyDown } = useListKeys(ids, props);
  return (
    <div
      role="listbox"
      aria-label="Participants"
      tabIndex={0}
      aria-activedescendant={activeOption}
      onKeyDown={onKeyDown}
      className={LISTBOX}
    >
      {props.groups.map((group) => (
        <Group key={group.label} {...props} group={group} />
      ))}
    </div>
  );
}

/**
 * Test participants, then everyone a search finds, as one listbox: a click or a key previews
 * another one, while focus stays on the list.
 */
export function ParticipantPicker(props: Readonly<ParticipantPickerProps>) {
  const base = useId();
  const optionId = (memberId: string) => `${base}-${memberId}`;
  return (
    <div className="flex flex-col gap-3">
      <SearchField {...props} />
      <OptionList {...props} optionId={optionId} />
    </div>
  );
}
