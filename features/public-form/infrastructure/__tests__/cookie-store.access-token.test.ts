import { Result } from "@/lib/result";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FormTokenCookieStore } from "../cookie-store";

const FORM_ID = "form-1";
const NOW_UNIX = 1_800_000_000;
const accessToken = (expiryUnix: number) => `22.${expiryUnix}.s.stamp~sig`;

describe("FormTokenCookieStore with a personalized link's access token", () => {
  const cookieJar = { get: vi.fn(), set: vi.fn(), delete: vi.fn() };
  const store = () =>
    new FormTokenCookieStore(cookieJar as unknown as ReadonlyRequestCookies);
  const holding = (token: string) =>
    cookieJar.get.mockReturnValue({
      value: JSON.stringify({ [FORM_ID]: token }),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW_UNIX * 1000);
  });

  it("returns an access token that has not expired", () => {
    holding(accessToken(NOW_UNIX + 60));

    const result = store().getToken(FORM_ID);

    expect(Result.isSuccess(result) && result.value).toBe(
      accessToken(NOW_UNIX + 60),
    );
  });

  it("treats an access token past its own expiry as gone", () => {
    holding(accessToken(NOW_UNIX - 1));

    expect(Result.isError(store().getToken(FORM_ID))).toBe(true);
  });

  it("keeps an opaque submission token, which carries no expiry", () => {
    holding("opaque-submission-token");

    expect(Result.isSuccess(store().getToken(FORM_ID))).toBe(true);
  });
});
