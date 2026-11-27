type RecordValue = Record<string, unknown>;

function record(value: unknown): value is RecordValue {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Exact JSON values: unlike SurveyJS answer comparison, true differs from "true". */
export function equalDefinition(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return (
      a.length === b.length && a.every((item, i) => equalDefinition(item, b[i]))
    );
  if (!record(a) || !record(b)) return false;
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every(
      (key) => Object.hasOwn(b, key) && equalDefinition(a[key], b[key]),
    )
  );
}

function ambiguous(): never {
  throw new Error(
    "The editor and stored definition cannot be matched. Review the definition again.",
  );
}

function identity(item: unknown) {
  return record(item) ? (item.name ?? item.value) : item;
}

function mergeList(
  source: unknown[],
  baseline: unknown[],
  edited: unknown[],
): unknown[] {
  if (baseline.length !== source.length) return ambiguous();
  const keys = baseline.map(item => identity(item));
  const editedKeys = edited.map(item => identity(item));
  if (equalDefinition(keys, editedKeys))
    return edited.map((v, i) => mergeValue(source[i], baseline[i], v));
  if (!unambiguousKeys(keys) || !unambiguousKeys(editedKeys)) return ambiguous();
  // A rename and a simultaneous removal/insertion look identical. Preserve source-only properties.
  const removesHiddenData = source.some((v, i) => !editedKeys.includes(keys[i]) && !equalDefinition(v, baseline[i]));
  if (removesHiddenData && editedKeys.some(k => !keys.includes(k))) return ambiguous();
  return edited.map((v, i) => {
    const index = keys.indexOf(editedKeys[i]);
    return index < 0 ? v : mergeValue(source[index], baseline[index], v);
  });
}

function unambiguousKeys(keys: unknown[]) {
  return !keys.includes(undefined) && new Set(keys).size === keys.length;
}
function mergeRecord(
  source: RecordValue,
  baseline: RecordValue,
  edited: RecordValue,
) {
  const result = { ...source };
  for (const key of Object.keys(baseline))
    if (!Object.hasOwn(edited, key)) delete result[key];
  for (const [key, value] of Object.entries(edited)) {
    if (equalDefinition(baseline[key], value)) continue;
    Object.defineProperty(result, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: mergeValue(source[key], baseline[key], value),
    });
  }
  return result;
}

function mergeObject(source: RecordValue, baseline: unknown, edited: unknown) {
  if (record(baseline) && record(edited))
    return mergeRecord(source, baseline, edited);
  if (typeof baseline === "string" && source.default === baseline)
    return typeof edited === "string" ? { ...source, default: edited } : edited;
  return ambiguous();
}

function mergeValue(
  source: unknown,
  baseline: unknown,
  edited: unknown,
): unknown {
  if (equalDefinition(baseline, edited)) return source;
  if (equalDefinition(baseline, source) || baseline === undefined)
    return edited;
  if (record(source)) return mergeObject(source, baseline, edited);
  if (Array.isArray(source) && Array.isArray(baseline) && Array.isArray(edited))
    return mergeList(source, baseline, edited);
  return ambiguous();
}
/** Replay only editor changes; values hidden or simplified by SurveyJS stay in the source. */
export function sourceWithEdits(
  source: object,
  baseline: object,
  edited: object,
): object {
  if (equalDefinition(baseline, edited)) return source;
  if (record(source) && Array.isArray(source.elements) && !Object.hasOwn(source, "pages")
    && record(baseline) && Array.isArray(baseline.pages) && record(edited)) {
    return sourceWithEdits(source, singlePageElements(baseline), singlePageElements(edited));
  }
  const result = mergeValue(source, baseline, edited);
  return record(result) ? result : ambiguous();
}

function singlePageElements(definition: RecordValue) {
  const { pages, ...survey } = definition;
  if (!Array.isArray(pages) || pages.length !== 1 || !record(pages[0])) return ambiguous();
  const { elements, name, ...other } = pages[0];
  if (name !== "page1" || Object.keys(other).length) return ambiguous();
  return { ...survey, elements };
}
