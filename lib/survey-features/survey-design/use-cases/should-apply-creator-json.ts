/** Skip same-content refetches; apply distinct snapshots and a new Creator. */
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

function isSameSurveyJson(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (
    left === null ||
    right === null ||
    typeof left !== "object" ||
    typeof right !== "object"
  ) {
    return false;
  }

  if (Array.isArray(left) !== Array.isArray(right)) {
    return false;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((item, index) => isSameSurveyJson(item, right[index]));
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every(
    (key) =>
      Object.hasOwn(rightRecord, key) &&
      isSameSurveyJson(leftRecord[key], rightRecord[key]),
  );
}
