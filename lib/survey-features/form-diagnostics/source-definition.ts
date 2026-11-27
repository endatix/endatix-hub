type RecordValue = Record<string, unknown>;

function record(value: unknown): value is RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function equalDefinition(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((item, i) => equalDefinition(item, b[i]));
  if (!record(a) || !record(b)) return false;
  return Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every(key => Object.hasOwn(b, key) && equalDefinition(a[key], b[key]));
}

function ambiguous(): never {
  throw new Error("The editor and stored definition cannot be matched. Review the definition again.");
}

function identity(item: unknown) {
  return record(item) ? item.name ?? item.value : item;
}

function mergeList(source: unknown[], baseline: unknown[], edited: unknown[]): unknown[] {
  if (baseline.length !== source.length) return ambiguous();
  const keys = baseline.map(item => identity(item));
  const stableOrder = edited.length === keys.length && edited.every((v, i) => identity(v) === keys[i]);
  if (!stableOrder && (keys.includes(undefined) || new Set(keys).size !== keys.length)) return ambiguous();
  return edited.map((v, i) => {
    const index = stableOrder ? i : keys.indexOf(identity(v));
    if (index < 0) return v;
    return mergeValue(source[index], baseline[index], v);
  });
}

function mergeRecord(source: RecordValue, baseline: RecordValue, edited: RecordValue) {
  const result = { ...source };
  for (const key of Object.keys(baseline)) if (!Object.hasOwn(edited, key)) delete result[key];
  for (const [key, value] of Object.entries(edited)) {
    if (equalDefinition(baseline[key], value)) continue;
    Object.defineProperty(result, key, { configurable: true, enumerable: true, writable: true,
      value: mergeValue(source[key], baseline[key], value) });
  }
  return result;
}

function mergeValue(source: unknown, baseline: unknown, edited: unknown): unknown {
  if (equalDefinition(baseline, edited)) return source;
  if (equalDefinition(baseline, source) || baseline === undefined) return edited;
  if (Array.isArray(source) && Array.isArray(baseline) && Array.isArray(edited))
    return mergeList(source, baseline, edited);
  if (record(source) && record(baseline) && record(edited)) return mergeRecord(source, baseline, edited);
  if (record(source) && typeof baseline === "string" && source.default === baseline)
    return typeof edited === "string" ? { ...source, default: edited } : edited;
  return ambiguous();
}

/** Replay only editor changes; values hidden or simplified by SurveyJS stay in the source. */
export function sourceWithEdits(source: object, baseline: object, edited: object): object {
  const result = mergeValue(source, baseline, edited);
  return record(result) ? result : ambiguous();
}
