"use client";

import type { EmbedMessagingContext } from "../types";

const EMBED_ID_QUERY_PARAM = "embedId";
const PARENT_ORIGIN_QUERY_PARAM = "parentOrigin";

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

function parseEmbedId(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return /^[a-zA-Z0-9:_-]{1,128}$/.test(value) ? value : undefined;
}

export function getEmbedMessagingContext(): EmbedMessagingContext {
  if (typeof globalThis.window === "undefined") {
    return {};
  }

  const search =
    typeof globalThis.window.location?.search === "string"
      ? globalThis.window.location.search
      : "";
  const searchParams = new URLSearchParams(search);

  debugger;

  return {
    embedId: parseEmbedId(searchParams.get(EMBED_ID_QUERY_PARAM)),
    parentOrigin: parseHttpOrigin(searchParams.get(PARENT_ORIGIN_QUERY_PARAM)),
  };
}
