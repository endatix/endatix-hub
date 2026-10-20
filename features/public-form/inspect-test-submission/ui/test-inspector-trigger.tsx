"use client";

import type { ComponentProps } from "react";
import { ClipperIcon } from "./clipper-icon";
import styles from "./test-inspector.module.css";

/**
 * The round Clipper button with an amber ring and a TEST tag, so test mode shows in screenshots
 * even while the menu is closed. Radix passes the menu's open state and handlers through.
 */
export function TestInspectorTrigger(props: ComponentProps<"button">) {
  return (
    <button
      {...props}
      aria-label="Test inspector, test submission"
      className={styles.trigger}
      data-testid="test-inspector-trigger"
      type="button"
    >
      <ClipperIcon className={styles.clipper} />
      <span aria-hidden="true" className={styles.tag}>
        TEST
      </span>
    </button>
  );
}
