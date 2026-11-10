import { ApiResult } from "@/lib/endatix-api";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openPublicForm } from "../open-public-form";

describe("openPublicForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POSTs the hub's open route with the URL token and returns the opened submission", async () => {
    // Arrange
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ submissionId: "42" }), { status: 200 }),
      );

    // Act
    const result = await openPublicForm("form-1", "token-1");

    // Assert
    expect(fetchSpy.mock.calls[0][0]).toMatch(
      /\/api\/public\/v0\/forms\/form-1\/submissions\/open$/,
    );
    expect(fetchSpy.mock.calls[0][1]).toMatchObject({
      method: "POST",
      body: JSON.stringify({ urlToken: "token-1" }),
    });
    expect(ApiResult.isSuccess(result) && result.data.submissionId).toBe("42");
  });

  it("names the open in a network error", async () => {
    // Arrange
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      new TypeError("Failed to fetch"),
    );

    // Act
    const result = await openPublicForm("form-1");

    // Assert
    expect(ApiResult.isError(result) && result.error.message).toBe(
      "Network error while opening the form.",
    );
  });

  it("names the open when the response is not JSON", async () => {
    // Arrange
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not json", { status: 200 }),
    );

    // Act
    const result = await openPublicForm("form-1");

    // Assert
    expect(ApiResult.isError(result) && result.error.message).toBe(
      "Failed to parse the open response.",
    );
  });
});
