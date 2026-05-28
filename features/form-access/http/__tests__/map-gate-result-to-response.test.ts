import { describe, expect, it } from "vitest";
import { Result } from "@/lib/result";
import { formAccessForbidden } from "../form-access-result";
import { mapGateResultToResponse } from "../map-gate-result-to-response";

describe("mapGateResultToResponse", () => {
  it("returns null for success", () => {
    expect(mapGateResultToResponse(Result.success({ ok: true }))).toBeNull();
  });

  it("maps validation errors to 400", () => {
    const response = mapGateResultToResponse(
      Result.validationError("formId is required"),
    )!;
    expect(response.status).toBe(400);
  });

  it("maps form access forbidden to 403", () => {
    const response = mapGateResultToResponse(
      formAccessForbidden("Form access denied"),
    )!;
    expect(response.status).toBe(403);
  });

  it("maps submission mismatch to 403", () => {
    const response = mapGateResultToResponse(
      Result.error("submissionId does not match access token"),
    )!;
    expect(response.status).toBe(403);
  });

  it("maps permission denial via forbidden detail to 403", () => {
    const response = mapGateResultToResponse(
      formAccessForbidden("File view is not permitted"),
    )!;
    expect(response.status).toBe(403);
  });
});
