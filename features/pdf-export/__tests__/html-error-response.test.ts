import { describe, expect, it } from "vitest";
import { asBrowserExportError } from "../html-error-response";
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

  const RETRY_TARGET = "/export-pdf/123?token=super-secret-token";

  it("stores the retry link for an upstream failure", async () => {
    // Arrange
    const jsonResponse = apiResponses.badGateway({
      detail: "Failed to load submission from the Endatix API.",
    });

    // Act
    const response = await asBrowserExportError(
      jsonResponse,
      "text/html",
      RETRY_TARGET,
    );

    // Assert - HttpOnly and path-scoped, so script cannot read it and it is
    // only ever sent to the error page.
    const cookie = response.cookies.get("endatix_export_retry");
    expect(cookie?.value).toBe(RETRY_TARGET);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.path).toBe("/export-error");
    expect(cookie?.sameSite).toBe("lax");
  });

  /**
   * A timed-out render keeps running after the deadline, so there is no retry
   * button - and therefore no reason to keep the token in a cookie.
   */
  it("does not store the token for a code with no retry button", async () => {
    // Arrange
    const jsonResponse = apiResponses.badGateway({
      detail: "PDF export took too long.",
      errorCode: "pdf_render_timeout",
    });

    // Act
    const response = await asBrowserExportError(
      jsonResponse,
      "text/html",
      RETRY_TARGET,
    );

    // Assert
    expect(response.cookies.get("endatix_export_retry")).toBeUndefined();
  });

  it("refuses to store a tampered retry target", async () => {
    // Arrange
    const jsonResponse = apiResponses.badGateway({ detail: "Upstream down." });

    // Act
    const response = await asBrowserExportError(
      jsonResponse,
      "text/html",
      "https://evil.com/export-pdf/1?token=a",
    );

    // Assert
    expect(response.cookies.get("endatix_export_retry")).toBeUndefined();
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
