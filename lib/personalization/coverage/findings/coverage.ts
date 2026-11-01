import { usageVerdicts, type AudienceUsage } from "../audience-usage";
import type { AudienceFinding } from "./types";

/** A Property the form reads that some real participants have not filled in. */
export function notFilledInFindings(usage: AudienceUsage): AudienceFinding[] {
  const { forProperty } = usageVerdicts(usage);
  return usage.variableNames.flatMap((variableName) => {
    const { used, filledReal, real } = forProperty(variableName);
    return used && filledReal < real
      ? [{ kind: "not-filled-in" as const, variableName, filledReal, real }]
      : [];
  });
}
