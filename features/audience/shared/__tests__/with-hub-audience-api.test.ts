import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn(),
}));

vi.mock("@/lib/feature-flags", () => ({
  personalizationFlag: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/endatix-api", () => ({
  EndatixApi: vi.fn(),
}));

describe("withHubAudienceApi", () => {
  const requireHubAccess = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    vi.clearAllMocks();
    const { auth } = await import("@/auth");
    const { authorization } = await import("@/features/auth/authorization");
    vi.mocked(auth).mockResolvedValue({ accessToken: "token" } as never);
    vi.mocked(authorization).mockResolvedValue({ requireHubAccess } as never);
  });

  it("returns an error when personalization is off", async () => {
    const { personalizationFlag } = await import("@/lib/feature-flags");
    const { EndatixApi } = await import("@/lib/endatix-api");
    vi.mocked(personalizationFlag).mockResolvedValue(false);
    const run = vi.fn();

    const { withHubAudienceApi } = await import("../with-hub-audience-api");
    const result = await withHubAudienceApi(run, {
      formId: "1",
      fallbackMessage: "failed",
      logMessage: "failed",
      loggerName: "audience.test",
    });

    expect(Result.isError(result)).toBe(true);
    if (Result.isError(result)) {
      expect(result.message).toBe(
        "Personalization is not enabled for this environment.",
      );
    }
    expect(run).not.toHaveBeenCalled();
    expect(EndatixApi).not.toHaveBeenCalled();
  });
});
