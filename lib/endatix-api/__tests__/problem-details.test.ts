import { describe, expect, it } from "vitest";
import { parseProblemDetails } from "../shared/problem-details";

describe("parseProblemDetails", () => {
  it("parses the canonical Endatix RFC7807 body with fields and traceId", () => {
    const parsed = parseProblemDetails({
      type: "https://www.rfc-editor.org/rfc/rfc9110#name-400-bad-request",
      title: "There was a problem with your request",
      status: 400,
      detail: "Name is required.",
      instance: "/api/forms",
      traceId: "0HMPNHL0JHL76:00000001",
      errorCode: "NotEmptyValidator",
      fields: { name: ["Name is required."] },
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.status).toBe(400);
    expect(parsed?.detail).toBe("Name is required.");
    expect(parsed?.traceId).toBe("0HMPNHL0JHL76:00000001");
    expect(parsed?.errorCode).toBe("NotEmptyValidator");
    expect(parsed?.fields).toEqual({ name: ["Name is required."] });
  });

  it("returns null for the legacy FastEndpoints ErrorResponse shape", () => {
    const parsed = parseProblemDetails({
      statusCode: 400,
      message: "One or more errors occurred!",
      errors: {
        password: ["password is too short!"],
      },
    });

    expect(parsed).toBeNull();
  });

  it("accepts PascalCase .NET ProblemDetails members", () => {
    const parsed = parseProblemDetails({
      Type: "about:blank",
      Title: "Resource not found",
      Status: 404,
      Detail: "Form not found",
      TraceId: "trace-404",
    });

    expect(parsed).not.toBeNull();
    expect(parsed?.status).toBe(404);
    expect(parsed?.detail).toBe("Form not found");
    expect(parsed?.traceId).toBe("trace-404");
  });
});
