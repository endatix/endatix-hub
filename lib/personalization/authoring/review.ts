import type { AudienceVariables } from "@/lib/endatix-api/audience/types";
import { notFilledInFindings } from "./findings/coverage";
import type { AudienceReview } from "./findings/types";
import { unusedProperties } from "./findings/unused-properties";
import { lintedUsage } from "./usage";

/**
 * The form's Audience findings, the same for the designer and the Audience tab: the linter's, the
 * Properties it never reads, and the ones real participants have not filled in. Empty without
 * Properties (Q10).
 */
export function reviewAudience(
  surveyJson: object,
  variables: AudienceVariables,
): AudienceReview {
  const linted = lintedUsage(surveyJson, variables);
  if (!linted) return { findings: [] };
  const { findings, usage } = linted;
  return {
    findings: [
      ...findings,
      ...unusedProperties(usage),
      ...notFilledInFindings(usage),
    ],
  };
}
