import type { AudienceFinding } from "./types";

/**
 * Properties the form never reads. A name a question or calculated value also declares is left to
 * the collision warning: the linter counts that name as declared, so it never shows up as read.
 */
export function unusedProperties(
  variableNames: string[],
  read: Set<string>,
  collisions: Set<string>,
): AudienceFinding[] {
  return variableNames
    .filter((name) => {
      const key = name.toLowerCase();
      return !read.has(key) && !collisions.has(key);
    })
    .map((variableName) => ({ kind: "unused-property", variableName }));
}
