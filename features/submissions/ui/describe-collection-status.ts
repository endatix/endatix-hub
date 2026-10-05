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

/** Grid and detail share this map. An unknown code stays off and uses the code as its label. */
export function describeCollectionStatus(
  code: string | undefined,
  isComplete: boolean,
): CollectionStatusView {
  const supplied = code?.trim().toLowerCase();
  if (supplied) {
    return BUILT_IN[supplied] ?? { tone: "off", label: supplied };
  }

  const fallback = isComplete ? "complete" : "in_progress";
  return BUILT_IN[fallback];
}
