import { describe, expect, it } from "vitest";
import { ApiErrorType } from "@/lib/endatix-api";
import { toApiPageError } from "../page-error";

describe("toApiPageError", () => {
  it("returns null for successful results", () => {
    expect(
      toApiPageError({
        success: true,
        data: { id: "1" },
      }),
    ).toBeNull();
  });

  it("maps auth errors", () => {
    expect(
      toApiPageError({
        success: false,
        error: {
          type: ApiErrorType.AuthError,
          message: "Unauthorized",
        },
      }),
    ).toEqual({ kind: "auth" });
  });

  it("maps forbidden errors", () => {
    expect(
      toApiPageError({
        success: false,
        error: {
          type: ApiErrorType.ForbiddenError,
          message: "Forbidden",
        },
      }),
    ).toEqual({ kind: "forbidden" });
  });

  it("maps other API errors to api kind", () => {
    expect(
      toApiPageError({
        success: false,
        error: {
          type: ApiErrorType.NotFoundError,
          message: "Folder not found",
        },
      }),
    ).toEqual({ kind: "api", message: "Folder not found" });
  });
});
