/**
 * GET /themes returns a JSON array (`Ok<IEnumerable<ThemeModel>>`).
 * Some Hub list endpoints use `{ items }`. Accept both so Theme Editor is not empty.
 */
export function parseThemesPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (
    payload !== null &&
    typeof payload === "object" &&
    "items" in payload &&
    Array.isArray((payload as { items: unknown }).items)
  ) {
    return (payload as { items: T[] }).items;
  }

  return [];
}
