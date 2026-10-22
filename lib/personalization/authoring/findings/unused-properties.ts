import { undeclaredReferences } from "./lint-findings";
import type { AudienceFinding } from "./types";

/**
 * Properties the form never reads. A name a question also uses is left to the collision warning:
 * the form then reads the question, so the reference says nothing about the property.
 */
export function unusedProperties(
  json: object,
  variableNames: string[],
  collisions: Set<string>,
): AudienceFinding[] {
  const read = undeclaredReferences(json);
  return variableNames
    .filter((name) => {
      const key = name.toLowerCase();
      return !read.has(key) && !collisions.has(key);
    })
    .map((variableName) => ({ kind: "unused-property", variableName }));
}
