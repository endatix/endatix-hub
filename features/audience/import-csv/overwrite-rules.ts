import {
  AudienceImportOption,
  type AudienceImportOptions,
} from "@/lib/endatix-api/audience/types";

export type OverwriteRule = {
  key: keyof AudienceImportOptions;
  title: string;
  help: string;
  /** What each option says; `keep` is the recommended one and always the default. */
  labels: Record<AudienceImportOption, string>;
};

/** How the write treats a participant already on the form (D5, D6); the safe choice comes first. */
export const OVERWRITE_RULES: readonly OverwriteRule[] = [
  {
    key: "emptyCells",
    title: "Empty cells in your file",
    help: "A cell left empty for a participant already on this form.",
    labels: {
      [AudienceImportOption.Keep]: "Keep the current value",
      [AudienceImportOption.Clear]: "Clear the value",
    },
  },
  {
    key: "missingProperties",
    title: "Properties not in your file",
    help: "Properties no column of the file is imported into.",
    labels: {
      [AudienceImportOption.Keep]: "Leave them",
      [AudienceImportOption.Clear]: "Clear them",
    },
  },
];

export const KEEP_VALUES: AudienceImportOptions = Object.freeze({
  emptyCells: AudienceImportOption.Keep,
  missingProperties: AudienceImportOption.Keep,
});

/** The options an import was started with; an API before endatix#1419 only kept values. */
export function importOptionsOf(
  view: Partial<AudienceImportOptions>,
): AudienceImportOptions {
  return {
    emptyCells: view.emptyCells ?? AudienceImportOption.Keep,
    missingProperties: view.missingProperties ?? AudienceImportOption.Keep,
  };
}
