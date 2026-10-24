"use client";

import { copyValueToClipboard } from "@/components/copy-to-clipboard";
import { useState } from "react";
import { StayOpenItem } from "./stay-open-item";
import styles from "./test-inspector.module.css";

type CopyState = "idle" | "copied" | "failed";

const LABELS: Record<CopyState, string> = {
  idle: "Copy as JSON",
  copied: "Copied",
  failed: "Copy failed",
};

/** Copies a panel's data as JSON. A menu item, so arrow keys reach it. */
export function CopyJsonItem({ data }: Readonly<{ data: unknown }>) {
  const [state, setState] = useState<CopyState>("idle");
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
