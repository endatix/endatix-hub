import { describe, expect, it } from "vitest";
import {
  EXPORT_ERROR_CODE,
  getExportErrorContent,
  resolveExportErrorCode,
} from "../export-error-content";

describe("resolveExportErrorCode", () => {
  it.each([
    [400, undefined, EXPORT_ERROR_CODE.INVALID],
    [401, undefined, EXPORT_ERROR_CODE.EXPIRED],
    [403, undefined, EXPORT_ERROR_CODE.FORBIDDEN],
    [404, undefined, EXPORT_ERROR_CODE.NOT_FOUND],
    [502, undefined, EXPORT_ERROR_CODE.UPSTREAM],
    [500, undefined, EXPORT_ERROR_CODE.UNKNOWN],
  ])("maps status %i to %s", (status, errorCode, expected) => {
    expect(resolveExportErrorCode(status, errorCode)).toBe(expected);
  });

  it("prefers the render timeout code over the status", () => {
    expect(resolveExportErrorCode(502, "pdf_render_timeout")).toBe(
      EXPORT_ERROR_CODE.TIMEOUT,
    );
  });

  it("maps an expired token regardless of status", () => {
    expect(resolveExportErrorCode(404, "token_expired")).toBe(
      EXPORT_ERROR_CODE.EXPIRED,
    );
  });
});

describe("getExportErrorContent", () => {
  it("returns copy for every known code", () => {
    for (const code of Object.values(EXPORT_ERROR_CODE)) {
      const content = getExportErrorContent(code);

      expect(content.key).toBe(code);
      expect(content.title.length).toBeGreaterThan(0);
      expect(content.description.length).toBeGreaterThan(0);
    }
  });

  /** The code arrives from a user-controlled query string. */
  it.each([undefined, "", "nonsense", "__proto__", "constructor"])(
    "falls back to the generic page for %p",
    (code) => {
      expect(getExportErrorContent(code).key).toBe(EXPORT_ERROR_CODE.UNKNOWN);
    },
  );
});
