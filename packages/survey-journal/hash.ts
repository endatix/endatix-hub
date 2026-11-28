// The wire hash orders UTF-16 code units, independent of the browser's locale.
function ordinal(left: string, right: string) {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/** Writer and replayer use the same key order, independently of the server's head hash. */
export function canonicalSurvey(jsonData: string): string {
  return JSON.stringify(JSON.parse(jsonData), (_, value) => {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      return value;
    return Object.fromEntries(
      Object.keys(value)
        .sort(ordinal)
        .map((key) => [key, value[key]]),
    );
  });
}

export async function writerHash(jsonData: string) {
  const canonical = new TextEncoder().encode(canonicalSurvey(jsonData));
  const digest = await crypto.subtle.digest("SHA-256", canonical);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
