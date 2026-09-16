import { describe, expect, it } from "vitest";
import { asBrowserExportError } from "../browser-export-error";
import { apiResponses } from "@/lib/utils/route-handlers";

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
    );

    // Assert
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "/export-error?code=upstream",
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
    );

    // Assert
    expect(response.headers.get("location")).toContain("code=timeout");
  });

  /**
   * Behind a reverse proxy the Node process sees its own internal origin
   * (`http://<container-id>:8080`), not the address the visitor typed. An
   * absolute Location built from the request sends the browser to a host it
   * cannot resolve; a relative one is resolved against the real URL.
   */
  it("redirects relatively, never to an absolute origin", async () => {
    // Arrange
    const jsonResponse = apiResponses.badGateway({
      detail: "PDF export took too long.",
      errorCode: "pdf_render_timeout",
    });

    // Act
    const response = await asBrowserExportError(jsonResponse, "text/html");

    // Assert
    const location = response.headers.get("location") ?? "";
    expect(location.startsWith("/")).toBe(true);
    expect(location).not.toContain("://");
  });

  /** The reference is a correlation id, so it may travel in the URL. */
  it("carries the API trace id through as a support reference", async () => {
    // Arrange
    const jsonResponse = apiResponses.badGateway({
      detail: "Upstream down.",
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736",
    });

    // Act
    const response = await asBrowserExportError(jsonResponse, "text/html");

    // Assert
    expect(response.headers.get("location")).toBe(
      "/export-error?code=upstream&ref=4bf92f3577b34da6a3ce929d0e0e4736",
    );
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
    );

    // Assert
    const location = response.headers.get("location") ?? "";
    expect(location).not.toContain("super-secret-token");
    expect(location).not.toContain("token");
    expect(location).toContain("code=forbidden");
  });
});
