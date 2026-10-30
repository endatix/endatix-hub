"use client";

import { useEffect, useState } from "react";
import type { AudienceLinksPreview } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { previewAudienceLinksAction } from "./generate-audience-links.action";

/**
 * The panel's count of who gets a link. `older`: an API before link batches, which sends a link
 * to everyone. `unknown`: the count failed; Generate still runs, the API checks again.
 */
export type LinksPreviewState =
  | { kind: "loading" }
  | { kind: "ready"; preview: AudienceLinksPreview }
  | { kind: "older" }
  | { kind: "unknown" };

const LOADING: LinksPreviewState = { kind: "loading" };

async function readPreview(
  formId: string,
  search: string,
): Promise<LinksPreviewState> {
  try {
    const result = await previewAudienceLinksAction(formId, search);
    if (Result.isError(result)) return { kind: "unknown" };
    return result.value
      ? { kind: "ready", preview: result.value }
      : { kind: "older" };
  } catch {
    return { kind: "unknown" };
  }
}

/** Counted again on every open: links issued since change who is left without one. */
export function useLinksPreview(formId: string, search: string, open: boolean) {
  const [settled, setSettled] = useState<LinksPreviewState | null>(null);
  useEffect(() => {
    if (!open) return;
    let current = true;
    void readPreview(formId, search).then((state) => {
      if (current) setSettled(state);
    });
    return () => {
      current = false;
    };
  }, [formId, search, open]);
  return { preview: settled ?? LOADING, reset: () => setSettled(null) };
}

/** The search a batch runs with: an older API sends to everyone, so it gets none. */
export function batchSearch(preview: LinksPreviewState, search: string) {
  return preview.kind === "older" ? "" : search;
}

/** Whether Generate would send nothing, or more than one batch may. */
export function blocksGenerate(preview: LinksPreviewState): boolean {
  if (preview.kind === "loading") return true;
  if (preview.kind !== "ready") return false;
  const { withoutLink, cap } = preview.preview;
  return withoutLink === 0 || withoutLink > cap;
}
