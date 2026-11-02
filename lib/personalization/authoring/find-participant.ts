import type { AudienceVariablePreset } from "@/lib/endatix-api/audience/types";
import type { Result } from "@/lib/result";

/** Where the picker's next page starts: Test participants are read first, then real ones. */
export type ParticipantCursor = { test: boolean; page: number };

/** One participant the picker lists. */
export type FoundParticipant = {
  audienceMemberId: string;
  identifier: string;
  isTest: boolean;
};

/** A page of the picker; `next` is null once both groups are read. */
export type FoundParticipants = {
  participants: FoundParticipant[];
  next: ParticipantCursor | null;
};

export type FindParticipantsRequest = {
  search: string;
  /** Omitted for the first page. */
  cursor?: ParticipantCursor;
};

/** The reads behind Find participant, bound to the form by the designer page. */
export type ParticipantFinder = {
  find(request: FindParticipantsRequest): Promise<Result<FoundParticipants>>;
  /** One participant's values, by audience member id. */
  preset(audienceMemberId: string): Promise<Result<AudienceVariablePreset>>;
};
