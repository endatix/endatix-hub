import { describe, expect, it } from "vitest";
import { asBrowserExportError } from "../html-error-response";
import { apiResponses } from "@/lib/utils/route-handlers";

const REQUEST_URL =
  "https://hub.example.com/export-pdf/123?token=super-secret-token";

describe("asBrowserExportError", () => {
  it("keeps JSON and the real status when Accept is application/json", async () => {
    // Arrange
    const jsonResponse = apiResponses.notFound({
      detail: "Submission not found.",
    });

    // Act
    const response = await asBrowserExportError(
      jsonResponse,
      "application/json",
      REQUEST_URL,
    );

    // Assert
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.status).toBe(404);
  });

  it("redirects browsers to the export error page", async () => {
    // Arrange
    const jsonResponse = apiResponses.badGateway({
      detail: "Failed to load submission from the Endatix API.",
    });

    // Act
    const response = await asBrowserExportError(
      jsonResponse,
      "text/html,application/xhtml+xml",
      REQUEST_URL,
    );

    // Assert
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://hub.example.com/export-error?code=upstream",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("maps a render timeout to the timeout page", async () => {
    // Arrange
    const jsonResponse = apiResponses.badGateway({
      detail: "PDF export took too long.",
      errorCode: "pdf_render_timeout",
    });

    // Act
    const response = await asBrowserExportError(
      jsonResponse,
      "text/html",
      REQUEST_URL,
    );

    // Assert
    expect(response.headers.get("location")).toContain("code=timeout");
  });

  /**
   * The export URL carries an access token. The redirect is built from scratch,
   * so nothing from the original query string can ride along into browser
   * history, a Referer header, or a shared screenshot.
   */
  it("never forwards the access token to the error page", async () => {
    // Arrange
    const jsonResponse = apiResponses.forbidden({
      detail: "Access token does not have export permissions.",
    });

    // Act
    const response = await asBrowserExportError(
      jsonResponse,
      "text/html",
      REQUEST_URL,
    );

    // Assert
    const location = response.headers.get("location") ?? "";
    expect(location).not.toContain("super-secret-token");
    expect(location).not.toContain("token");
    expect(location).toContain("code=forbidden");
  });
});
