import { describe, expect, it, vi, beforeEach } from "vitest";
import { Result } from "@/lib/result";

const unstableUpdate = vi.fn();
const invalidateCache = vi.fn();

vi.mock("@/auth", () => ({
  unstable_update: (...args: unknown[]) => unstableUpdate(...args),
}));

vi.mock(
  "@/features/auth/authorization/application/authorization-data.provider",
  () => ({
    invalidateUserAuthorizationCache: (...args: unknown[]) =>
      invalidateCache(...args),
  }),
);

function unsignedJwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.x`;
}

describe("replaceSessionTokens", () => {
  beforeEach(() => {
    unstableUpdate.mockReset();
    invalidateCache.mockReset();
    unstableUpdate.mockResolvedValue({});
  });

  it("replaces NextAuth tokens and clears the auth cache", async () => {
    const { replaceSessionTokens } = await import("../replace-session-tokens");
    const accessToken = unsignedJwt({
      sub: "7",
      tid: "99",
      act: "7",
      exp: 1_800_000_000,
    });

    const result = await replaceSessionTokens(accessToken, "refresh-token");

    expect(Result.isSuccess(result)).toBe(true);
    expect(unstableUpdate).toHaveBeenCalledWith({
      accessToken,
      refreshToken: "refresh-token",
      expiresAt: 1_800_000_000,
    });
    expect(invalidateCache).toHaveBeenCalledWith({ userId: "7" });
  });
});
