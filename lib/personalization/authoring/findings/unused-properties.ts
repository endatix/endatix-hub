import type { AudienceUsage } from "../../audience-usage";
import type { AudienceFinding } from "./types";

/**
 * Properties the form never reads. A name a question or calculated value also declares counts as
 * read: the collision warning says what is wrong with it.
 */
export function unusedProperties({
  variableNames,
  read,
}: AudienceUsage): AudienceFinding[] {
  return variableNames
    .filter((name) => !read.includes(name.toLowerCase()))
    .map((variableName) => ({ kind: "unused-property", variableName }));
}
