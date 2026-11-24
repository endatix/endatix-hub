import { expect, it, vi } from "vitest";
import { receiveRetainedAttachment } from "../retained-attachment";

const selection = {
  url: "/api/forms/100/export?format=csv&exportFormatId=2",
  formatKey: "csv",
  filename: "form.csv",
};
const headers = {
  "Content-Disposition": 'attachment; filename="old.csv"',
  "Content-Type": "text/csv",
};

it("receives a complete attachment for exactly the requested selection", async () => {
  // Arrange
  const request = vi
    .fn()
    .mockResolvedValue(new Response("old note", { headers }));
  // Act
  const file = await receiveRetainedAttachment(
    selection,
    new AbortController().signal,
    request,
  );
  // Assert
  expect(request.mock.calls[0][0]).toBe(selection.url);
  expect(file.filename).toBe("old.csv");
  expect(await file.blob.text()).toBe("old note");
});

it.each([
  [200, { ...headers, "Content-Type": "text/html" }, "Sign in"],
  [200, { ...headers, "Content-Disposition": "inline" }, "old"],
  [206, headers, "old"],
  [200, { ...headers, "Content-Length": "10" }, "old"],
  [200, headers, ""],
])(
  "rejects a response that is not a complete selected file",
  async (status, metadata, body) => {
    // Arrange
    const response = new Response(body, { status, headers: metadata });
    // Act & Assert
    await expect(
      receiveRetainedAttachment(
        selection,
        new AbortController().signal,
        vi.fn().mockResolvedValue(response),
      ),
    ).rejects.toThrow();
  },
);

it("discards received chunks if the body stream fails after successful headers", async () => {
  // Arrange
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("partial"));
    },
    pull(controller) {
      controller.error(new Error("Transfer interrupted"));
    },
  });
  const response = new Response(body, { headers });
  // Act & Assert
  await expect(
    receiveRetainedAttachment(
      selection,
      new AbortController().signal,
      vi.fn().mockResolvedValue(response),
    ),
  ).rejects.toThrow("Transfer interrupted");
});
