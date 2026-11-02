"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { MAX_AUDIENCE_SEARCH_LENGTH } from "@/lib/endatix-api/audience/types";
import type {
  ParticipantFinder,
  PreviewAs,
} from "@/lib/personalization/authoring";
import { ParticipantList } from "./participant-list";
import { usePickParticipant } from "./use-pick-participant.hook";
import { useParticipantSearch } from "./use-participant-search.hook";

/** Opened by the Preview tab's Find participant; the pick goes to `previewAs`. */
export interface FindParticipantRequest {
  previewAs: PreviewAs;
}

interface FindParticipantDialogProps {
  finder: ParticipantFinder;
  request: FindParticipantRequest | null;
  onClose: () => void;
}

export function FindParticipantDialog({
  finder,
  request,
  onClose,
}: Readonly<FindParticipantDialogProps>) {
  if (!request) return null;
  const onPicked: PreviewAs = (preset, isTest) => {
    request.previewAs(preset, isTest);
    onClose();
  };
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <FindParticipantHeader />
        <ParticipantPicker finder={finder} onPicked={onPicked} />
      </DialogContent>
    </Dialog>
  );
}

function FindParticipantHeader() {
  return (
    <DialogHeader>
      <DialogTitle>Find participant</DialogTitle>
      <DialogDescription>
        Preview the form with a participant&apos;s values. Test participants are
        listed first.
      </DialogDescription>
    </DialogHeader>
  );
}

type PickerProps = { finder: ParticipantFinder; onPicked: PreviewAs };

function ParticipantPicker({ finder, onPicked }: Readonly<PickerProps>) {
  const { search, setSearch, loadMore, ...list } = useParticipantSearch(finder);
  const { pickError, clearPickError, ...picking } = usePickParticipant(
    finder,
    onPicked,
  );
  const onSearch = (value: string) => {
    clearPickError();
    setSearch(value);
  };
  return (
    <div className="flex flex-col gap-3">
      <SearchField value={search} onChange={onSearch} />
      <PickerAlert message={pickError ?? list.error} />
      <ParticipantList {...list} {...picking} onEnd={loadMore} />
    </div>
  );
}

function SearchField({
  value,
  onChange,
}: Readonly<{ value: string; onChange(value: string): void }>) {
  return (
    <Input
      type="search"
      autoFocus
      placeholder="Search by identifier"
      aria-label="Search participants by identifier"
      value={value}
      maxLength={MAX_AUDIENCE_SEARCH_LENGTH}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function PickerAlert({ message }: Readonly<{ message: string | null }>) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}
