/**
 * True when this Creator should receive `json`.
 * Same-content new objects (dev RSC refetch) are skipped; distinct snapshots
 * (AI chat turns) are applied. A new Creator instance always applies.
 */
export function shouldApplyCreatorJson(
  creator: object | null,
  json: object | null,
  appliedTo: object | null,
  lastAppliedJson: object | null,
): boolean {
  if (!creator || !json) {
    return false;
  }

  if (appliedTo !== creator) {
    return true;
  }

  return !isSameSurveyJson(lastAppliedJson, json);
}

function isSameSurveyJson(left: object | null, right: object): boolean {
  if (left === right) {
    return true;
  }

  if (!left) {
    return false;
  }

  return JSON.stringify(left) === JSON.stringify(right);
}
