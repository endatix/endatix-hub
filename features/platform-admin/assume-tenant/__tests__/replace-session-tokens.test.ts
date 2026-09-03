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

vi.mock("@/features/telemetry", () => ({
  TelemetryLogger: { warn: vi.fn(), error: vi.fn() },
}));

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

  it("keeps the swap successful when cache invalidation throws", async () => {
    // The cookie already holds the new tokens; a stale cache must not make the
    // caller skip its redirect and report failure.
    invalidateCache.mockImplementation(() => {
      throw new Error("revalidateTag failed");
    });
    const { replaceSessionTokens } = await import("../replace-session-tokens");

    const result = await replaceSessionTokens(
      unsignedJwt({ sub: "7", tid: "99", act: "7", exp: 1_800_000_000 }),
      "refresh-token",
    );

    expect(Result.isSuccess(result)).toBe(true);
  });

  it("fails when the session cookie cannot be written", async () => {
    unstableUpdate.mockRejectedValue(new Error("cookie write failed"));
    const { replaceSessionTokens } = await import("../replace-session-tokens");

    const result = await replaceSessionTokens(
      unsignedJwt({ sub: "7", exp: 1_800_000_000 }),
      "refresh-token",
    );

    expect(Result.isError(result)).toBe(true);
  });
});
