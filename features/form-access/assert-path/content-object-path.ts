const CONTENT_FORM_PREFIX = "f/";
const CONTENT_TEMPLATE_PREFIX = "t/";

/** Returns true if the blob name is a content object path. Form or template. */
function isContentObjectPath(blobName: string): boolean {
  return (
    blobName.startsWith(CONTENT_FORM_PREFIX) ||
    blobName.startsWith(CONTENT_TEMPLATE_PREFIX)
  );
}

export { isContentObjectPath };
