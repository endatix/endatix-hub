import type { ISurveyVariablePresets } from "survey-core";
import {
  AudienceIdentifierKind,
  type AudienceVariablePreset,
} from "@/lib/endatix-api/audience/types";

/**
 * What the designer's save sends: every preset except the read-only ones, which are real
 * participants, those the variables read listed plus any picked later. A real one sent back after it
 * changed on People fails the whole save, and one removed from the form would be added back as a
 * Test participant, so the save must never carry them. Names match by the tenant's match key, as the
 * API matches them, so a real participant's email typed with other capitals is left out too.
 */
export function testParticipantPresets(
  edited: ISurveyVariablePresets | undefined,
  readOnlyPresets: readonly string[],
  identifierKind: AudienceIdentifierKind,
): AudienceVariablePreset[] {
  const isReadOnly = readOnlyMatcher(readOnlyPresets, identifierKind);
  return (edited?.presets ?? [])
    .filter((preset) => !isReadOnly(preset.name))
    .map(({ name, variables }) => ({
      name,
      variables: structuredClone(variables),
    }));
}

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
