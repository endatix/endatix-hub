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

function readRequestBody(urls: string[], runtime: StorageReadRuntime, purpose?: "rich-text") {
  const body = BUILD_READ_URLS_BODY[runtime.policyName](urls, runtime);
  if (purpose !== "rich-text" || runtime.policyName !== "public") return body;
  const { urls: richTextImages, ...gate } = body;
  return { ...gate, richTextImages };
}

export {
  pickStorageReadEndpoint,
  pickStorageDeleteEndpoint,
} from "./storage-api-policy";

export async function fetchStorageReadUrls(
  urls: string[],
  runtime: StorageReadRuntime | null,
  purpose?: "rich-text",
): Promise<ReadUrlsResponse | null> {
  if (runtime === null) {
    return null;
  }

  const body = readRequestBody(urls, runtime, purpose);

  try {
    const res = await fetch(pickStorageReadEndpoint(runtime.policyName), {
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
