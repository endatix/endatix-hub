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
      /** Whether a Property named after `variable` declares it: Add as Audience property. */
      canAddProperty: boolean;
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
    }
  | {
      kind: "prefill-type-mismatch";
      /** The Property's variable, as the definition names it. */
      variable: string;
      propertyTitle: string;
      path: string;
      elementName?: string;
      /** Clears `defaultValueExpression` and leaves `readOnly`. */
      fix?: AudienceFix;
    };

export type AudienceReview = { findings: AudienceFinding[] };
