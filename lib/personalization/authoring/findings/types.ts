import type { ILintFix } from "survey-core/linter";

export type AudienceFix = ILintFix;

/** A problem with how the form reads its Audience variables. Every one is a warning (Q8). */
export type AudienceFinding =
  | {
      kind: "unknown-variable";
      /** The `{name}` as written. */
      variable: string;
      path: string;
      elementName?: string;
      /** The declared name it most likely meant. */
      suggestion?: string;
      fix?: AudienceFix;
    }
  | {
      kind: "variable-collision";
      variable: string;
      path: string;
      elementName?: string;
      /** What else declares the name: a question loses its answer, a calculated value races it. */
      declaredBy: "question" | "calculatedValue";
    }
  | { kind: "unused-property"; variableName: string }
  | {
      kind: "not-filled-in";
      variableName: string;
      /** Real participants with a value, of `real` on the form. */
      filledReal: number;
      real: number;
    };

/** Whether the form reads a property, and how many real participants filled it in. */
export type PropertyUse = { used: boolean; filledReal: number; real: number };

export type AudienceReview = {
  findings: AudienceFinding[];
  forProperty(variableName: string): PropertyUse;
  /** Of the properties the form reads, those a participant with `filled` values lacks. */
  notFilledIn(filled: string[]): string[];
};
