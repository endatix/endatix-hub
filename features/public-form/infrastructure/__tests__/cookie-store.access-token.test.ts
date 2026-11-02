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

  it("keeps an access token past its expiry, so the API can refuse it as expired", () => {
    holding(accessToken(NOW_UNIX - 1));

    const result = store().getToken(FORM_ID);

    expect(Result.isSuccess(result) && result.value).toBe(
      accessToken(NOW_UNIX - 1),
    );
  });

  it("returns the form's access token", () => {
    holding(accessToken(NOW_UNIX + 60));

    expect(store().getAccessToken(FORM_ID)).toBe(accessToken(NOW_UNIX + 60));
  });

  it("returns no access token for an opaque submission token", () => {
    holding("opaque-submission-token");

    expect(store().getAccessToken(FORM_ID)).toBeUndefined();
  });
});
