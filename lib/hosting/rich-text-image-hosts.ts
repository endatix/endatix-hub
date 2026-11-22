/**
 * `REMOTE_IMAGE_HOSTNAMES` as a list: comma-separated, trimmed, empty entries
 * dropped. The one parser for `next.config` image `remotePatterns` and for the
 * hosts author rich text may load images from.
 */
export function parseRemoteImageHostnames(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((hostname) => hostname.trim())
    .filter((hostname) => hostname.length > 0);
}

/**
 * Hosts that author rich text on Submission Details may load images from:
 * `REMOTE_IMAGE_HOSTNAMES` plus the storage hosts (the same sources as
 * `images.remotePatterns`). Unlike `next.config`, an empty list never means
 * "any host", and wildcard entries are skipped: hosts are matched exactly.
 */
export function collectRichTextImageHosts(
  storageHostnames: readonly string[],
  remoteImageHostnames: string | undefined = process.env.REMOTE_IMAGE_HOSTNAMES,
): readonly string[] {
  const hosts = [
    ...parseRemoteImageHostnames(remoteImageHostnames),
    ...storageHostnames.map((hostname) => hostname.trim()),
  ]
    .filter((hostname) => hostname.length > 0 && !hostname.includes("*"))
    .map((hostname) => hostname.toLowerCase());
  return Object.freeze([...new Set(hosts)]);
}
