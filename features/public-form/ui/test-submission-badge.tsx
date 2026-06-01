import styles from "./test-submission-badge.module.css";

/**
 * Renders a badge indicating that the user is submitting a test response.
 */
export function TestSubmissionBadge() {
  return (
    <div
      aria-label="Test response mode"
      className={styles.anchor}
      data-testid="respondent-test-mode-badge"
      role="status"
      tabIndex={0}
    >
      <div className={`sd-slider__tooltip ${styles.badge}`}>
        <div className="sd-slider__tooltip-panel">
          <div className="sd-slider__tooltip-value">
            You are submitting test response
          </div>
        </div>
      </div>
    </div>
  );
}
