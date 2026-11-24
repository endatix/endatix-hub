import { describe, expect, it } from "vitest";
import { ApiResult } from "@/lib/endatix-api/shared/api-result";
import { toUpstreamFileResponse } from "../route-handlers";

describe("toUpstreamFileResponse", () => {
  it("does not promote a partial attachment response to a complete file", () => {
    // Arrange
    const part = new Response("part", {
      status: 206,
      headers: { "Content-Length": "4" },
    });
    // Act
    const response = toUpstreamFileResponse(ApiResult.success(part));
    // Assert
    expect(response.status).toBe(206);
    expect(response.headers.get("Content-Length")).toBe("4");
  });
  it("proxies upstream body and download headers on success", async () => {
    // Arrange
    const upstream = new Response("col1,col2\nv1,v2", {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="list.csv"',
      },
    });

    // Act
    const response = toUpstreamFileResponse(ApiResult.success(upstream));

    // Assert
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "text/csv; charset=utf-8",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="list.csv"',
    );
    await expect(response.text()).resolves.toBe("col1,col2\nv1,v2");
  });

  it("applies fallback headers when upstream omits them", () => {
    // Arrange — Uint8Array body so fetch does not invent a Content-Type
    const upstream = new Response(new Uint8Array([1, 2, 3]), { status: 200 });

    // Act
    const response = toUpstreamFileResponse(ApiResult.success(upstream), {
      fallbackContentType: "application/json",
      fallbackContentDisposition: 'attachment; filename="fallback.json"',
    });

    // Assert
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="fallback.json"',
    );
  });

  it("defaults to octet-stream and attachment when no headers exist", () => {
    // Arrange
    const upstream = new Response(new Uint8Array([1, 2, 3]), { status: 200 });

    // Act
    const response = toUpstreamFileResponse(ApiResult.success(upstream));

    // Assert
    expect(response.headers.get("Content-Type")).toBe(
      "application/octet-stream",
    );
    expect(response.headers.get("Content-Disposition")).toBe("attachment");
  });

  it("returns JSON error payload with upstream status when ApiResult fails", async () => {
    // Arrange
    const result = ApiResult.notFoundError<Response>("Data list not found", {
      statusCode: 404,
    });

    // Act
    const response = toUpstreamFileResponse(result);

    // Assert
    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    await expect(response.json()).resolves.toEqual({
      error: "Data list not found",
    });
  });

  it("passes the API's support reference with the error", async () => {
    // Arrange
    const result = ApiResult.serverError<Response>("Export failed", {
      statusCode: 400,
      traceId: "00-plan-ref",
    });

    // Act
    const response = toUpstreamFileResponse(result);

    // Assert
    await expect(response.json()).resolves.toEqual({
      error: "Export failed",
      traceId: "00-plan-ref",
    });
  });

  it("defaults error status to 500 when ApiResult has no statusCode", async () => {
    // Arrange
    const result = ApiResult.unknownError<Response>("Boom");

    // Act
    const response = toUpstreamFileResponse(result);

    // Assert
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "Boom" });
  });
});
