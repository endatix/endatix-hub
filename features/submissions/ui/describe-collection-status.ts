import type { StatusTone } from "@/components/common/status-badge";

/** Built-in collection-status wire codes. Unknown codes render as themselves. */
const BUILT_IN: Record<string, { tone: StatusTone; label: string }> = {
  in_progress: { tone: "attention", label: "In progress" },
  complete: { tone: "on", label: "Complete" },
  screen_out: { tone: "off", label: "Screened out" },
  quota_full: { tone: "off", label: "Quota full" },
  expired: { tone: "attention", label: "Expired" },
  abandoned: { tone: "off", label: "Abandoned" },
  cancelled: { tone: "off", label: "Cancelled" },
};

export type CollectionStatusView = {
  tone: StatusTone;
  label: string;
};

/**
 * One mapping for the submissions grid and the submission detail.
 * Three tones only — see DESIGN.md Status vocabulary.
 */
export function describeCollectionStatus(
  code: string | undefined,
  isComplete: boolean,
): CollectionStatusView {
  const resolved = code?.trim().toLowerCase() || (isComplete ? "complete" : "in_progress");
  return BUILT_IN[resolved] ?? { tone: "off", label: resolved };
}
