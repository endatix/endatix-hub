import type { AudienceVariableCoverage } from "@/lib/endatix-api/audience/types";
import type { AudienceFinding, PropertyUse } from "./types";

/** What the form reads, by lower-cased variable name, and the coverage the API counted. */
export type CoverageInput = {
  variableNames: string[];
  read: Set<string>;
  coverage: AudienceVariableCoverage;
};

/** Whether the form reads the property, and how many real participants filled it in. */
export function propertyUse(
  variableName: string,
  { read, coverage }: Omit<CoverageInput, "variableNames">,
): PropertyUse {
  const key = variableName.toLowerCase();
  const counted = coverage.properties.find(
    (p) => p.variableName.toLowerCase() === key,
  );
  return {
    used: read.has(key),
    filledReal: counted?.filledReal ?? 0,
    real: coverage.participants.real,
  };
}

/** A property the form reads that some real participants have not filled in. */
export function notFilledInFindings(input: CoverageInput): AudienceFinding[] {
  return input.variableNames.flatMap((variableName) => {
    const use = propertyUse(variableName, input);
    return use.used && use.filledReal < use.real
      ? [{ kind: "not-filled-in" as const, variableName, ...pick(use) }]
      : [];
  });
}

const pick = ({ filledReal, real }: PropertyUse) => ({ filledReal, real });

/** The properties the form reads that one participant has no value for. */
export function notFilledInFor(
  filled: string[],
  { variableNames, read }: Omit<CoverageInput, "coverage">,
): string[] {
  const has = new Set(filled.map((name) => name.toLowerCase()));
  return variableNames.filter((name) => {
    const key = name.toLowerCase();
    return read.has(key) && !has.has(key);
  });
}
