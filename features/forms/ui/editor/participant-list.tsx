"use client";

import { Badge } from "@/components/ui/badge";
import type { FoundParticipant } from "@/lib/personalization/authoring";
import type { UIEvent } from "react";

const LOAD_MORE_WITHIN_PX = 48;

interface ParticipantListProps {
  participants: FoundParticipant[];
  loading: boolean;
  error: string | null;
  picking: boolean;
  onPick(participant: FoundParticipant): void;
  onEnd(): void;
}

/** Find participant's rows, Test participants labelled; scrolling to the end asks for more. */
export function ParticipantList(props: Readonly<ParticipantListProps>) {
  const { participants, loading, error } = props;
  return (
    <ul
      aria-label="Participants"
      aria-busy={loading}
      className="max-h-80 overflow-y-auto rounded-md border"
      onScroll={nearEnd(props.onEnd)}
    >
      <ParticipantRows {...props} />
      <ListStatus
        empty={!error && participants.length === 0}
        loading={loading}
      />
    </ul>
  );
}

function nearEnd(onEnd: () => void) {
  return ({ currentTarget: list }: UIEvent<HTMLElement>) => {
    const left = list.scrollHeight - list.scrollTop - list.clientHeight;
    if (left <= LOAD_MORE_WITHIN_PX) onEnd();
  };
}

function ParticipantRows(props: Readonly<ParticipantListProps>) {
  return props.participants.map((participant) => (
    <ParticipantRow
      key={participant.audienceMemberId}
      {...props}
      participant={participant}
    />
  ));
}

type RowProps = Pick<ParticipantListProps, "picking" | "onPick"> & {
  participant: FoundParticipant;
};

function ParticipantRow({ participant, picking, onPick }: Readonly<RowProps>) {
  return (
    <li>
      <button
        type="button"
        disabled={picking}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-hidden"
        onClick={() => onPick(participant)}
      >
        <span className="truncate">{participant.identifier}</span>
        {participant.isTest && (
          <Badge variant="secondary">Test participant</Badge>
        )}
      </button>
    </li>
  );
}

function ListStatus({
  empty,
  loading,
}: Readonly<{ empty: boolean; loading: boolean }>) {
  if (loading) {
    return (
      <li className="px-3 py-2 text-center text-sm text-muted-foreground">
        Loading…
      </li>
    );
  }
  if (!empty) return null;
  return (
    <li className="px-3 py-6 text-center text-sm text-muted-foreground">
      No participants found.
    </li>
  );
}
