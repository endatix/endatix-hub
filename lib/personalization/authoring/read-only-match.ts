import { AudienceIdentifierKind } from "@/lib/endatix-api/audience/types";

/**
 * Whether a name is one of the read-only presets by the tenant's match key: the one check the
 * editor's lock and the save share, so a row the save would leave out is never editable as a Test
 * participant.
 */
export function readOnlyMatcher(
  readOnlyPresets: readonly string[],
  identifierKind: AudienceIdentifierKind,
): (name: string) => boolean {
  const readOnly = new Set(
    readOnlyPresets.map((name) => matchKey(name, identifierKind)),
  );
  return (name) => readOnly.has(matchKey(name, identifierKind));
}

/**
 * OSS `Member.Normalize`: trimmed, and an email also through ASP.NET Identity's upper-invariant
 * lookup normalizer. External ids keep their case.
 */
function matchKey(identifier: string, kind: AudienceIdentifierKind): string {
  const trimmed = identifier.trim();
  return kind === AudienceIdentifierKind.Email
    ? trimmed.normalize().toUpperCase()
    : trimmed;
}
