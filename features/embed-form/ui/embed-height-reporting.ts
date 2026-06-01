import { EMBED_ID_QUERY_PARAM } from "./embed-messaging-context";

const frozenEmbedIds = new Set<string>();

export type EmbedId = string | undefined;

export function freezeEmbedHeightReporting(embedId: EmbedId): void {
  frozenEmbedIds.add(getEmbedKey(embedId));
}

export function resumeEmbedHeightReporting(embedId: EmbedId): void {
  frozenEmbedIds.delete(getEmbedKey(embedId));
}

export function isEmbedHeightReportingFrozen(embedId: EmbedId): boolean {
  return frozenEmbedIds.has(getEmbedKey(embedId));
}

function getEmbedKey(embedId: EmbedId): string {
  return embedId ?? EMBED_ID_QUERY_PARAM;
}
