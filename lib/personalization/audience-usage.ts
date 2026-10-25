import type { AudienceVariableCoverage } from "@/lib/endatix-api/audience/types";

/**
 * What a saved form reads of its Audience variables, small enough to send to the browser: worked
 * out on the server by `audienceUsage` (authoring), read here without SurveyJS.
 */
export type AudienceUsage = {
  /** The form's variable names, in tab order. */
  variableNames: string[];
  /** Lower-cased Property names the form reads, one a question or calculated value also uses included. */
  read: string[];
  /** Real and Test participants, and per Property how many filled it in. */
  coverage: AudienceVariableCoverage;
};

/** Whether the form reads a Property, and how many real participants filled it in. */
export type PropertyUse = { used: boolean; filledReal: number; real: number };

/** The verdicts the designer and the Audience tab share, from one usage. */
export type UsageVerdicts = {
  forProperty(variableName: string): PropertyUse;
  /** Of the Properties the form reads, those a participant with `filled` values lacks. */
  notFilledIn(filled: string[]): string[];
};

function propertyUse(
  usage: AudienceUsage,
  read: Set<string>,
  variableName: string,
): PropertyUse {
  const key = variableName.toLowerCase();
  const counted = usage.coverage.properties.find(
    (p) => p.variableName.toLowerCase() === key,
  );
  return {
    used: read.has(key),
    filledReal: counted?.filledReal ?? 0,
    real: usage.coverage.participants.real,
  };
}

function notFilledIn(
  usage: AudienceUsage,
  read: Set<string>,
  filled: string[],
): string[] {
  const has = new Set(filled.map((name) => name.toLowerCase()));
  return usage.variableNames.filter((name) => {
    const key = name.toLowerCase();
    return read.has(key) && !has.has(key);
  });
}

export function usageVerdicts(usage: AudienceUsage): UsageVerdicts {
  const read = new Set(usage.read);
  return {
    forProperty: (variableName) => propertyUse(usage, read, variableName),
    notFilledIn: (filled) => notFilledIn(usage, read, filled),
  };
}
