/**
 * Key for a paged list's `PagedListFrame`, built from the **parsed** list
 * request (page, page size, filters, sort). Every field the parser emits is
 * part of the key, so a new filter or sort field can never be forgotten.
 *
 * Object keys are sorted and `undefined` / `null` are dropped, so field order
 * and "absent vs null" do not change the key. Values are JSON-encoded, so a
 * delimiter inside a value (`a|b`) cannot collide with another field.
 */
export function listQueryKey(request: object): string {
  return JSON.stringify(canonicalize(request));
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .filter((key) => record[key] !== undefined && record[key] !== null)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => [key, canonicalize(record[key])]),
    );
  }

  return value;
}
