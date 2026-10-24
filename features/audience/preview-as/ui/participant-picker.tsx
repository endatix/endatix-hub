"use client";

import { useId, useState, type KeyboardEvent } from "react";
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

/** The next member id an arrow key moves to; none past either end. */
function stepFrom(ids: string[], selectedId: string | undefined, key: string) {
  const step = STEP[key];
  if (!step) return undefined;
  const at = selectedId ? ids.indexOf(selectedId) : -1;
  if (at === -1) return step > 0 ? ids[0] : undefined;
  return ids[at + step];
}

function SearchField({
  search,
  onSearch,
}: Readonly<Pick<ParticipantPickerProps, "search" | "onSearch">>) {
  const [query, setQuery] = useState(search);
  return (
    <form
      role="search"
      className="relative"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(query);
      }}
    >
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        name="q"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        aria-label="Find a participant"
        placeholder="Find any participant"
        className="pl-8"
      />
    </form>
  );
}

type OptionProps = {
  person: AudiencePerson;
  id: string;
  selected: boolean;
  onSelect: (memberId: string) => void;
};

function ParticipantOption({
  person,
  id,
  selected,
  onSelect,
}: Readonly<OptionProps>) {
  return (
    <div
      id={id}
      role="option"
      aria-selected={selected}
      onClick={() => onSelect(person.audienceMemberId)}
      className={cn(
        "cursor-pointer rounded-md px-2 py-1.5 text-sm break-all hover:bg-muted",
        selected && "bg-muted font-medium",
      )}
    >
      <WithTestBadge isTest={person.isTest}>{person.identifier}</WithTestBadge>
    </div>
  );
}

/**
 * Test participants, then everyone a search finds, as one listbox: a click or the arrow keys
 * preview the next one, while focus stays on the list.
 */
export function ParticipantPicker(props: Readonly<ParticipantPickerProps>) {
  const { groups, selectedId, onSelect } = props;
  const base = useId();
  const optionId = (memberId: string) => `${base}-${memberId}`;
  const ids = groups.flatMap((group) =>
    group.people.map((person) => person.audienceMemberId),
  );
  const onKeyDown = (event: KeyboardEvent) => {
    if (!STEP[event.key]) return;
    event.preventDefault();
    const next = stepFrom(ids, selectedId, event.key);
    if (next) onSelect(next);
  };
  return (
    <div className="flex flex-col gap-3">
      <SearchField {...props} />
      <div
        role="listbox"
        aria-label="Participants"
        tabIndex={0}
        aria-activedescendant={selectedId ? optionId(selectedId) : undefined}
        onKeyDown={onKeyDown}
        className="flex flex-col gap-4 rounded-xl border bg-card p-2 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {groups.map((group) => (
          <div key={group.label} role="group" aria-label={group.label}>
            <div
              role="presentation"
              className="px-2 pb-1 text-xs font-medium text-muted-foreground"
            >
              {group.label}
            </div>
            {group.people.map((person) => (
              <ParticipantOption
                key={person.audienceMemberId}
                person={person}
                id={optionId(person.audienceMemberId)}
                selected={person.audienceMemberId === selectedId}
                onSelect={onSelect}
              />
            ))}
            {group.note ? (
              <p className="px-2 pt-1 text-xs text-muted-foreground">
                {group.note}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
