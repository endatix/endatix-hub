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

type Settled = { key: string; state: LinksPreviewState };

type PreviewRequest = {
  formId: string;
  search: string;
  session: number;
  open: boolean;
};

/**
 * Counted again for every open and every search: links issued since change who is left without
 * one. `session` changes on each open; a count for another open or search reads as loading.
 */
export function useLinksPreview({
  formId,
  search,
  session,
  open,
}: PreviewRequest): LinksPreviewState {
  const key = `${session}:${search}`;
  const [settled, setSettled] = useState<Settled | null>(null);
  useEffect(() => {
    if (!open) return;
    let current = true;
    void readPreview(formId, search).then((state) => {
      if (current) setSettled({ key, state });
    });
    return () => {
      current = false;
    };
  }, [formId, search, key, open]);
  return settled?.key === key ? settled.state : LOADING;
}

/** The search a batch runs with: an older API sends to everyone, so it gets none. */
export function batchSearch(preview: LinksPreviewState, search: string) {
  return preview.kind === "older" ? "" : search;
}

/** Why Generate waits, or `null` when it can run. */
export function generateBlock(
  preview: LinksPreviewState,
): "loading" | "none-left" | "over-cap" | null {
  if (preview.kind === "loading") return "loading";
  if (preview.kind !== "ready") return null;
  const { withoutLink, cap } = preview.preview;
  if (withoutLink === 0) return "none-left";
  return withoutLink > cap ? "over-cap" : null;
}
