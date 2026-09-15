import { describe, expect, it } from "vitest";
import { asBrowserExportError } from "../html-error-response";
import { apiResponses } from "@/lib/utils/route-handlers";

describe("asBrowserExportError", () => {
  it("keeps JSON when Accept is application/json", async () => {
    // Arrange
    const jsonResponse = apiResponses.notFound({
      detail: "Submission not found.",
    });

    // Act
    const response = await asBrowserExportError(
      jsonResponse,
      "application/json",
    );

    // Assert
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.status).toBe(404);
  });

  it("returns HTML when Accept prefers text/html", async () => {
    // Arrange
    const jsonResponse = apiResponses.badGateway({
      detail: "Failed to load submission from the Endatix API.",
    });

    // Act
    const response = await asBrowserExportError(
      jsonResponse,
      "text/html,application/xhtml+xml",
    );
    const body = await response.text();

    // Assert
    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(body).toContain("Failed to load submission from the Endatix API.");
  });
});
