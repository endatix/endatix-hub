import { once } from "node:events";
import { createServer, type IncomingHttpHeaders } from "node:http";
import { buffer } from "node:stream/consumers";
import { gunzipSync } from "node:zlib";
import { CaptureError } from "posthog-node";
import { expect, it, onTestFinished, vi } from "vitest";
import {
  getPostHog,
  resetPostHogServer,
  trackEvent,
  trackException,
} from "../server/node-client";

const PROJECT_TOKEN = "phc_synthetic";
const CAPTURE_PATH = "/i/v1/analytics/events";
type CaptureRequest = {
  method?: string;
  url?: string;
  headers: IncomingHttpHeaders;
  body: Buffer;
};

async function recordCapture(responseBody: string) {
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
  useLocalCaptureHost(origin);
  return requests;
}

function useLocalCaptureHost(origin: string) {
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

it("delivers the server event and exception to the configured capture proxy", async () => {
  // Arrange
  const requests = await recordCapture('{"results":{}}');
  const client = captureClient();
  const onError = vi.fn();
  client.on("error", onError);

  // Act
  await trackEvent("sample_event", { formId: "sample" });
  await trackException(new Error("Sample failure"), { formId: "sample" });
  await client.flush();

  // Assert
  expect(onError).not.toHaveBeenCalled();
  expect(requests.flatMap(readBatch)).toMatchObject([
    {
      event: "sample_event",
      distinct_id: "server",
      properties: { formId: "sample" },
    },
    {
      event: "$exception",
      distinct_id: "server",
      properties: {
        formId: "sample",
        $exception_list: [{ type: "Error", value: "Sample failure" }],
      },
    },
  ]);
});

it("reports the event as undelivered when a proxy returns its own 200", async () => {
  // Arrange
  const requests = await recordCapture('{"ok":true}');
  const client = captureClient();
  const onError = vi.fn();
  client.on("error", onError);

  // Act
  await trackEvent("sample_event");
  await client.flush();

  // Assert
  expect(requests).toHaveLength(1);
  const error = onError.mock.calls[0]?.[0];
  expect(error).toBeInstanceOf(CaptureError);
  expect(error).toMatchObject({
    endpoint: CAPTURE_PATH,
    retryExhausted: [expect.any(String)],
  });
});
