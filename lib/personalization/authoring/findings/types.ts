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
      /** What else declares the name: its value replaces the variable's, or the other way round. */
      declaredBy: "question" | "calculatedValue";
    }
  | { kind: "unused-property"; variableName: string };

export type AudienceReview = { findings: AudienceFinding[] };
