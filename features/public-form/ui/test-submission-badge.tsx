import styles from "./test-submission-badge.module.css";

/**
 * Renders a badge indicating that the user is submitting a test response.
 */
export function TestSubmissionBadge() {
  return (
    <output
      aria-label="Test response mode"
      className={styles.anchor}
      data-testid="respondent-test-mode-badge"
    >
      <span className={`sd-slider__tooltip ${styles.badge}`}>
        <span className="sd-slider__tooltip-panel">
          <span className="sd-slider__tooltip-value">
            You are submitting test response
          </span>
        </span>
      </span>
    </output>
  );
}
