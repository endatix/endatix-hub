"use client";

import {
  type Dispatch,
  useCallback,
  useEffect,
  useReducer,
  useRef,
} from "react";
import type {
  FoundParticipant,
  FoundParticipants,
  ParticipantCursor,
  ParticipantFinder,
} from "@/lib/personalization/authoring";
import { Result, toActionFailure } from "@/lib/result";

const SEARCH_DELAY_MS = 250;
const FAILED = "Failed to find participants.";

type SearchState = {
  search: string;
  participants: FoundParticipant[];
  next: ParticipantCursor | null;
  loading: boolean;
  error: string | null;
};

export type ParticipantSearch = Omit<SearchState, "next"> & {
  setSearch(search: string): void;
  /** Reads the next page; does nothing while one is loading or when none is left. */
  loadMore(): void;
};

type SearchEvent =
  | { type: "search"; search: string }
  | { type: "loading" }
  | { type: "read"; page: FoundParticipants; append: boolean }
  | { type: "failed"; message: string; append: boolean };

const INITIAL: SearchState = {
  search: "",
  participants: [],
  next: null,
  loading: true,
  error: null,
};

/** Typing clears the list, so a next page never mixes with an earlier search. */
function searchReducer(state: SearchState, event: SearchEvent): SearchState {
  switch (event.type) {
    case "search":
      return { ...INITIAL, search: event.search };
    case "loading":
      return { ...state, loading: true };
    case "read":
      return withPage(state, event.page, event.append);
    case "failed":
      return {
        ...(event.append ? state : { ...state, participants: [], next: null }),
        loading: false,
        error: event.message,
      };
  }
}

function withPage(
  state: SearchState,
  page: FoundParticipants,
  append: boolean,
): SearchState {
  const participants = append
    ? appendNew(state.participants, page.participants)
    : page.participants;
  return {
    ...state,
    loading: false,
    error: null,
    participants,
    next: page.next,
  };
}

/** A participant added or moved between page reads can come back on the next page. */
function appendNew(
  shown: FoundParticipant[],
  read: FoundParticipant[],
): FoundParticipant[] {
  const ids = new Set(shown.map((p) => p.audienceMemberId));
  return [...shown, ...read.filter((p) => !ids.has(p.audienceMemberId))];
}

/**
 * Find participant's list: the first page for the search (read again a moment after typing
 * stops), then each next page on request. A read that a newer search overtook is dropped.
 */
export function useParticipantSearch(
  finder: ParticipantFinder,
): ParticipantSearch {
  const [state, dispatch] = useReducer(searchReducer, INITIAL);
  const [read, dropReads] = useLatestRead(finder, state.search, dispatch);
  useFirstPage(read, state.search);
  const setSearch = useCallback(
    (search: string) => {
      dropReads();
      dispatch({ type: "search", search });
    },
    [dropReads],
  );
  const { next, loading } = state;
  const loadMore = useCallback(() => {
    if (!loading && next) void read(next);
  }, [loading, next, read]);
  return { ...state, setSearch, loadMore };
}

/** Reads a page for the search; only the latest read, not dropped since, reaches the state. */
function useLatestRead(
  finder: ParticipantFinder,
  search: string,
  dispatch: Dispatch<SearchEvent>,
) {
  const latest = useRef(0);
  const dropReads = useCallback(() => {
    latest.current += 1;
  }, []);
  const read = useCallback(
    async (cursor?: ParticipantCursor) => {
      const id = ++latest.current;
      dispatch({ type: "loading" });
      const result = await finder
        .find(cursor ? { search, cursor } : { search })
        .catch(toActionFailure<FoundParticipants>(FAILED));
      if (id === latest.current) dispatch(toEvent(result, !!cursor));
    },
    [finder, search, dispatch],
  );
  return [read, dropReads] as const;
}

function toEvent(
  result: Result<FoundParticipants>,
  append: boolean,
): SearchEvent {
  return Result.isError(result)
    ? { type: "failed", message: result.message, append }
    : { type: "read", page: result.value, append };
}

function useFirstPage(read: () => Promise<void>, search: string): void {
  useEffect(() => {
    const timer = setTimeout(() => void read(), search ? SEARCH_DELAY_MS : 0);
    return () => clearTimeout(timer);
  }, [read, search]);
}
