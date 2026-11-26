import type { ClientStorageConfig } from "@endatix/storage-core";
import { parseStorageObjectUrl } from "../../utils";

/** Canonical content references use the configured origin and the exact provider object path. */
export function canonicalContentImage(source: string, config: ClientStorageConfig): string | null {
  const object = parseStorageObjectUrl(source, config);
  if (object?.containerType !== "CONTENT") return null;
  const canonical = `${config.protocol}://${config.hostName}/${object.containerName}/${object.blobName}`;
  return source === canonical ? canonical : null;
}
