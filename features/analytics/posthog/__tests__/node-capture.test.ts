import { CaptureError } from "posthog-node";
import { expect, it } from "vitest";
import { CAPTURE_PATH, recordCapture } from "@/test/stubs/posthog-capture";
import { trackEvent, trackException } from "../server/node-client";

it("delivers the server event and exception to the configured capture proxy", async () => {
  // Arrange
  const capture = await recordCapture();

  // Act
  await trackEvent("sample_event", { formId: "sample" });
  await trackException(new Error("Sample failure"), { formId: "sample" });
  await capture.client.flush();

  // Assert
  expect(capture.onError).not.toHaveBeenCalled();
  expect(capture.events()).toMatchObject([
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
  const capture = await recordCapture('{"ok":true}');

  // Act
  await trackEvent("sample_event");
  await capture.client.flush();

  // Assert
  expect(capture.requests).toHaveLength(1);
  const error = capture.onError.mock.calls[0]?.[0];
  expect(error).toBeInstanceOf(CaptureError);
  expect(error).toMatchObject({
    endpoint: CAPTURE_PATH,
    retryExhausted: [expect.any(String)],
  });
});
