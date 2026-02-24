/**
 * Represents a single field extracted from a form definition schema.
 */
export interface DefinitionField {
  /** The field name as defined in the SurveyJS schema (matches the key in submission jsonData). */
  name: string;
  /** The human-readable label shown to the respondent. */
  title: string;
  /** The SurveyJS element type (e.g. "text", "radiogroup", "checkbox", "file"). Custom question types are returned as-is. */
  type: string;
}
