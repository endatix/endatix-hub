import styles from "./test-submission-badge.module.css";

/**
 * Corner indicator that the respondent is in test-submission mode.
 * Positioned like the Next.js dev overlay so it can grow into a control.
 */
export function TestSubmissionBadge() {
  return (
    <aside
      aria-label="Test response mode"
      className={styles.anchor}
      data-testid="respondent-test-mode-badge"
    >
      <span className={styles.badge}>
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
        You are submitting test response
      </span>
    </aside>
  );
}
