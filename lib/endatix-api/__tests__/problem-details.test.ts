import { describe, expect, it } from "vitest";
import { parseProblemDetails } from "../shared/problem-details";

describe("parseProblemDetails", () => {
  it("parses RFC7807 camelCase problem details", () => {
    const problem = parseProblemDetails({
      type: "https://tools.ietf.org/html/rfc7231#section-6.6.1",
      title: "Export failed",
      status: 500,
      detail:
        "Form schema has not been compiled for this form. Save or publish the form definition to trigger compilation.",
    });

    expect(problem?.detail).toContain("Form schema has not been compiled");
    expect(problem?.status).toBe(500);
  });

  it("parses PascalCase problem details from default .NET serialization", () => {
    const problem = parseProblemDetails({
      Title: "Export failed",
      Status: 409,
      Detail:
        "Form schema has not been compiled for this form. Save or publish the form definition to trigger compilation.",
    });

    expect(problem?.detail).toContain("Form schema has not been compiled");
    expect(problem?.status).toBe(409);
    expect(problem?.title).toBe("Export failed");
  });

  it("accepts partial payloads with only detail and status", () => {
    const problem = parseProblemDetails({
      detail: "Export format is not supported.",
      status: 400,
    });

    expect(problem?.detail).toBe("Export format is not supported.");
    expect(problem?.status).toBe(400);
    expect(problem?.title).toBe("Error");
  });

  it("returns null for unrecognized payloads", () => {
    expect(parseProblemDetails({ message: "oops" })).toBeNull();
  });
});
