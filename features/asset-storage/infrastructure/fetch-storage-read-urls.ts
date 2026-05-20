import {
  buildHubStorageReadUrlsBody,
  buildPublicStorageReadUrlsBody,
} from "./storage-read-request";
import { pickStorageReadEndpoint } from "./storage-api-policy";
import type { StorageReadRuntime } from "./storage-read-runtime";
import type { ReadUrlsResponse } from "../use-cases/resolve-read-urls/resolve-read-urls";

export type {
  StorageApiPolicy,
  StorageReadRuntime,
} from "./storage-read-runtime";

const BUILD_READ_URLS_BODY = {
  public: buildPublicStorageReadUrlsBody,
  hub: buildHubStorageReadUrlsBody,
} as const;

export {
  pickStorageReadEndpoint,
  pickStorageDeleteEndpoint,
} from "./storage-api-policy";

export async function fetchStorageReadUrls(
  urls: string[],
  runtime: StorageReadRuntime | null,
): Promise<ReadUrlsResponse | null> {
  if (runtime === null) {
    return null;
  }

  const endpoint = pickStorageReadEndpoint(runtime.policyName);
  const body = BUILD_READ_URLS_BODY[runtime.policyName](urls, runtime);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return null;
    }

    return (await res.json()) as ReadUrlsResponse;
  } catch {
    return null;
  }
}
