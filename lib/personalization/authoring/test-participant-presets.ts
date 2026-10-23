import type { ISurveyVariablePresets } from "survey-core";
import type { AudienceVariablePreset } from "@/lib/endatix-api/audience/types";

/**
 * What the designer's save sends: every preset except the read-only ones, which are real
 * participants, those the variables read listed plus any picked later. A real one sent back after it
 * changed on People fails the whole save, and one removed from the form would be added back as a
 * Test participant, so the save must never carry them. Names match exactly, because the tenant's
 * match key is the API's: a real participant's identifier typed with other capitals is sent, and the
 * API refuses it ("Real participants are read-only.") when its values differ.
 */
export function testParticipantPresets(
  edited: ISurveyVariablePresets | undefined,
  readOnlyPresets: readonly string[],
): AudienceVariablePreset[] {
  const readOnly = new Set(readOnlyPresets);
  return (edited?.presets ?? [])
    .filter((preset) => !readOnly.has(preset.name))
    .map(({ name, variables }) => ({ name, variables }));
}
