import { PersonalizationSource } from "@/lib/endatix-api/submissions/types";

const SOURCE_LABELS: Record<PersonalizationSource, string> = {
  [PersonalizationSource.Link]: "Personalized link",
  [PersonalizationSource.OnBehalf]: "On behalf",
  [PersonalizationSource.Test]: "Test as this participant",
};

/** The Snapshot source's name. A source this Hub does not know yet (a newer API) is shown as sent. */
export function snapshotSourceLabel(source: string): string {
  return Object.hasOwn(SOURCE_LABELS, source)
    ? SOURCE_LABELS[source as PersonalizationSource]
    : source;
}
