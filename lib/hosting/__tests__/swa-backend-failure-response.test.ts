import { describe, expect, it } from "vitest";
import { swaBackendFailureResponse } from "../swa-backend-failure-response";

describe("swaBackendFailureResponse", () => {
  it("returns the standalone HTML page", async () => {
    // Arrange & Act
    const response = await swaBackendFailureResponse(502);
    const body = await response.text();

    // Assert
    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(body).toContain("Request timed out");
  });
});
