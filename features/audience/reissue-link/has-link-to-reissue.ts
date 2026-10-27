import {
  AudienceLinkStatusKind,
  type AudiencePerson,
} from "@/lib/endatix-api/audience/types";

/** A real participant whose link was issued or opened; a test participant never has one. */
export function hasLinkToReissue(
  person: Pick<AudiencePerson, "isTest" | "link">,
) {
  return !person.isTest && person.link.status !== AudienceLinkStatusKind.None;
}
