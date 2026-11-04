import type { ISurveyVariablePresets } from "survey-core";
import type { AudienceVariablePresets } from "@/lib/endatix-api/audience/types";

/**
 * The API already sends SurveyJS's shape; this only copies it, because the Creator's preset
 * editor writes into the container it is given.
 */
export function toSurveyPresets(
  wire: AudienceVariablePresets,
): ISurveyVariablePresets {
  return {
    definition: structuredClone(wire.definition),
    presets: wire.presets.map((preset) => ({
      name: preset.name,
      variables: structuredClone(preset.variables),
    })),
  };
}
