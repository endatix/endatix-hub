"use client";

import { isFillHeightMode } from "../height-mode";
import type { EmbedMessagingContext } from "../types";

export const EMBED_ID_QUERY_PARAM = "embedId";
const PARENT_ORIGIN_QUERY_PARAM = "parentOrigin";
const HEIGHT_MODE_QUERY_PARAM = "heightMode";

function parseHttpOrigin(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : undefined;
  } catch {
    return undefined;
  }
}

const EMBED_ID_PATTERN = /^[a-zA-Z0-9:_-]{1,128}$/;

/**
 * Charset/length allowlist for the embedId the parent-page SDK generates
 * (see createEmbedId in src/embed/embed.ts) to tell multiple embed
 * instances on one page apart and route postMessage traffic to the right
 * one. This is untrusted query input, not a security gate — it exists for
 * messaging, not to prove "the SDK was here" for other purposes.
 */
export function isValidEmbedId(
  value: string | null | undefined,
): value is string {
  return typeof value === "string" && EMBED_ID_PATTERN.test(value);
}

function parseEmbedId(value: string | null): string | undefined {
  return isValidEmbedId(value) ? value : undefined;
}

function parseHeightMode(value: string | null): "auto" | "fill" | undefined {
  return isFillHeightMode(value) ? "fill" : undefined;
}

export function getEmbedMessagingContext(): EmbedMessagingContext {
  if (globalThis.window === undefined) {
    return {};
  }

  const search =
    typeof globalThis.window.location?.search === "string"
      ? globalThis.window.location.search
      : "";
  const searchParams = new URLSearchParams(search);

  return {
    embedId: parseEmbedId(searchParams.get(EMBED_ID_QUERY_PARAM)),
    parentOrigin: parseHttpOrigin(searchParams.get(PARENT_ORIGIN_QUERY_PARAM)),
    heightMode: parseHeightMode(searchParams.get(HEIGHT_MODE_QUERY_PARAM)),
  };
}
