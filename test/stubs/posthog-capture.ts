import { once } from "node:events";
import { createServer, type IncomingHttpHeaders } from "node:http";
import { buffer } from "node:stream/consumers";
import { gunzipSync } from "node:zlib";
import { expect, onTestFinished, vi } from "vitest";
import {
  getPostHog,
  resetPostHogServer,
} from "@/features/analytics/posthog/server/node-client";

const PROJECT_TOKEN = "phc_synthetic";
export const CAPTURE_PATH = "/i/v1/analytics/events";
type CaptureRequest = {
  method?: string;
  url?: string;
  headers: IncomingHttpHeaders;
  body: Buffer;
};

export async function recordCapture(responseBody = '{"results":{}}') {
  const requests: CaptureRequest[] = [];
  const server = createServer(async (req, res) => {
    requests.push({
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: await buffer(req),
    });
    res
      .writeHead(200, { "Content-Type": "application/json" })
      .end(responseBody);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  onTestFinished(() => server[Symbol.asyncDispose]());
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Expected a TCP listener");
  const origin = `http://127.0.0.1:${address.port}`;
  configureLocalCapture(origin);
  const client = captureClient();
  const onError = vi.fn();
  client.on("error", onError);
  return {
    client,
    requests,
    onError,
    events: () => requests.flatMap((req) => readBatch(req)),
  };
}

function configureLocalCapture(origin: string) {
  const fetchLocal = fetch;
  vi.stubGlobal("fetch", (url: string, options: RequestInit) => {
    if (new URL(url).origin !== origin)
      throw new Error("Expected a local capture request");
    return fetchLocal(url, options);
  });
  vi.stubEnv("POSTHOG_HOST", origin);
  vi.stubEnv("POSTHOG_PROJECT_TOKEN", PROJECT_TOKEN);
}

function captureClient() {
  resetPostHogServer();
  const client = getPostHog();
  if (!client) throw new Error("Expected server analytics to be enabled");
  onTestFinished(async () => {
    await client.shutdown();
    resetPostHogServer();
  });
  return client;
}

function readBatch(request: CaptureRequest): unknown[] {
  expect(request).toMatchObject({
    method: "POST",
    url: CAPTURE_PATH,
    headers: {
      authorization: `Bearer ${PROJECT_TOKEN}`,
      "content-type": "application/json",
      "content-encoding": "gzip",
      "posthog-sdk-info": expect.stringMatching(/^posthog-node\/6\./),
      "posthog-attempt": "1",
      "posthog-request-id": expect.any(String),
      "posthog-request-timestamp": expect.any(String),
    },
  });
  return JSON.parse(gunzipSync(request.body).toString()).batch;
}
