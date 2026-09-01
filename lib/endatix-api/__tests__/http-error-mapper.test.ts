import { describe, expect, it } from "vitest";
import { ApiErrorType, ApiResult } from "../shared/api-result";
import { mapResponseToApiError } from "../shared/http-error-mapper";

describe("mapResponseToApiError", () => {
  it("maps 400 problem+json with fields and traceId to ValidationError", async () => {
    const body = {
      type: "https://www.rfc-editor.org/rfc/rfc9110#name-400-bad-request",
      title: "There was a problem with your request",
      status: 400,
      detail: "Name is required.",
      instance: "/api/forms",
      traceId: "0HMPNHL0JHL76:00000001",
      fields: { name: ["Name is required."] },
    };

    const response = new Response(JSON.stringify(body), {
      status: 400,
      statusText: "Bad Request",
      headers: { "Content-Type": "application/problem+json" },
    });

    const result = await mapResponseToApiError(response, {
      endpoint: "/api/forms",
      method: "POST",
    });

    expect(ApiResult.isError(result)).toBe(true);
    if (ApiResult.isError(result)) {
      expect(result.error.type).toBe(ApiErrorType.ValidationError);
      expect(result.error.message).toBe("Name is required.");
      expect(result.error.fields).toEqual({ name: ["Name is required."] });
      expect(result.error.details?.statusCode).toBe(400);
      expect(result.error.details?.details).toBe("Name is required.");
      expect(result.error.details?.traceId).toBe("0HMPNHL0JHL76:00000001");
    }
  });

  it("falls back to status semantics when body is legacy FE ErrorResponse", async () => {
    const response = new Response(
      JSON.stringify({
        statusCode: 400,
        message: "One or more errors occurred!",
        errors: { name: ["Name is required."] },
      }),
      {
        status: 400,
        statusText: "Bad Request",
        headers: { "Content-Type": "application/json" },
      },
    );

    const result = await mapResponseToApiError(response, {
      endpoint: "/api/forms",
      method: "POST",
    });

    expect(ApiResult.isError(result)).toBe(true);
    if (ApiResult.isError(result)) {
      expect(result.error.type).toBe(ApiErrorType.ValidationError);
      expect(result.error.fields).toBeUndefined();
    }
  });
});
