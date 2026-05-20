/** Whether a listed object should be treated as a user-visible file. */
export function isListableStorageObject(properties: {
  contentLength?: number;
  contentType?: string;
}): boolean {
  const contentLength = Number(properties.contentLength ?? 0);
  return contentLength > 0;
}
