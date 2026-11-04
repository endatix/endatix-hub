"use client";

import { copyValueToClipboard } from "@/components/copy-to-clipboard";
import { useEffect, useState } from "react";
import { StayOpenItem } from "./stay-open-item";
import styles from "./test-inspector.module.css";

type CopyState = "idle" | "copied" | "failed";

const LABELS: Record<CopyState, string> = {
  idle: "Copy as JSON",
  copied: "Copied",
  failed: "Copy failed",
};

/** As long as the clipboard toast, so the label and the toast clear together. */
const RESET_AFTER_MS = 4000;

/** The copy result, back to idle after a while so a second copy shows its own result. */
function useCopyState() {
  const [state, setState] = useState<CopyState>("idle");
  useEffect(() => {
    if (state === "idle") return;
    const reset = setTimeout(() => setState("idle"), RESET_AFTER_MS);
    return () => clearTimeout(reset);
  }, [state]);
  return [state, setState] as const;
}

/** Copies a panel's data as JSON. A menu item, so arrow keys reach it. */
export function CopyJsonItem({ data }: Readonly<{ data: unknown }>) {
  const [state, setState] = useCopyState();
  const copy = async () => {
    const copied = await copyValueToClipboard(JSON.stringify(data, null, 2));
    setState(copied ? "copied" : "failed");
  };
  return (
    <StayOpenItem className={styles.row} onAct={() => void copy()}>
      {LABELS[state]}
    </StayOpenItem>
  );
}
