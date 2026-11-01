import type { ReactNode } from "react";
import styles from "./test-submission-notice.module.css";

const WARNING_ICON = (
  <svg
    aria-hidden="true"
    className={styles.icon}
    fill="none"
    viewBox="0 0 16 16"
  >
    <path
      d="M8 5.25V8.5M8 11h.007M7.07 2.76 1.34 12.5A1.07 1.07 0 0 0 2.27 14h11.46a1.07 1.07 0 0 0 .93-1.5L8.93 2.76a1.07 1.07 0 0 0-1.86 0Z"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
    />
  </svg>
);

/**
 * Corner notice that the respondent is submitting a test submission. It holds no data: viewers
 * who may test forms get the Test inspector instead, except in embeds, which pass Start over in.
 */
export function TestSubmissionNotice({
  children,
}: Readonly<{ children?: ReactNode }>) {
  return (
    <aside
      aria-label="Test submission"
      className={styles.anchor}
      data-testid="respondent-test-mode-badge"
    >
      <span className={styles.badge}>
        {WARNING_ICON}
        You are submitting a test submission
      </span>
      {children}
    </aside>
  );
}
