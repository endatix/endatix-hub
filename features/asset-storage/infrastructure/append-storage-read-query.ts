/**
 * Appends a SAS or SigV4 presigned query string to a storage object URL.
 */
export function appendStorageReadQuery(
  baseUrl: string,
  queryWithoutLeadingQuestion: string,
): string {
  if (queryWithoutLeadingQuestion.length === 0) {
    return baseUrl;
  }
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}${queryWithoutLeadingQuestion}`;
}
