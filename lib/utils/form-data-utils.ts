/**
 * Gets a string value from a form data object for a given key.
 * @param formData - The form data object.
 * @param key - The key to get the value for.
 * @returns The string value or an empty string if the value is not a string.
 */
export function getStringFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/**
 * Gets all string values from a form data object for a given key.
 * @param formData - The form data object.
 * @param key - The key to get the values for.
 * @returns An array of string values.
 */
export function getStringFormValues(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string");
}
