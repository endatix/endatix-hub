/** A saved form definition's JSON as a survey object; `null` when empty, not JSON, or not an object. */
export function parseSurveyJson(jsonData: string | undefined): object | null {
  if (!jsonData) return null;
  try {
    const parsed: unknown = JSON.parse(jsonData);
    return typeof parsed === "object" &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}
