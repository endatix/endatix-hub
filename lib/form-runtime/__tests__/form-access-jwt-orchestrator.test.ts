import { describe, expect, it, vi, beforeEach } from "vitest";
import type { FormRuntimeState } from "@/lib/form-runtime/form-runtime.context";
import {
  ensureRuntimeFormAccessJwt,
  invalidateRuntimeFormAccessJwt,
} from "@/lib/form-runtime/form-access-jwt-orchestrator";
import {
  buildFormAccessTokenBody,
  createFormAccessToken,
} from "@/lib/form-runtime/form-access-token-client";

vi.mock("@/lib/form-runtime/form-access-token-client", () => ({
  buildFormAccessTokenBody: vi.fn(() => ({})),
  createFormAccessToken: vi.fn(),
}));

function createRuntimeState(
  overrides: Partial<FormRuntimeState> = {},
): FormRuntimeState {
  return {
    formId: "form-1",
    ...overrides,
  };
}

describe("form-access-jwt-orchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached token when it is still valid", async () => {
    const state = createRuntimeState({
      formAccessJwt: "cached-token",
      formAccessJwtExpiresAtUtc: new Date(Date.now() + 120_000).toISOString(),
    });

    const token = await ensureRuntimeFormAccessJwt(state);

    expect(token).toBe("cached-token");
    expect(createFormAccessToken).not.toHaveBeenCalled();
  });

  it("creates token and stores it in runtime state", async () => {
    vi.mocked(createFormAccessToken).mockResolvedValue({
      success: true,
      data: {
        token: "new-token",
        expiresAtUtc: "2030-01-01T00:00:00.000Z",
      },
    });

    const state = createRuntimeState();
    const token = await ensureRuntimeFormAccessJwt(state);

    expect(token).toBe("new-token");
    expect(buildFormAccessTokenBody).toHaveBeenCalledWith(state);
    expect(createFormAccessToken).toHaveBeenCalledWith("form-1", {});
    expect(state.formAccessJwt).toBe("new-token");
    expect(state.formAccessJwtExpiresAtUtc).toBe("2030-01-01T00:00:00.000Z");
  });

  it("deduplicates concurrent token creation for same runtime state", async () => {
    let resolveCreate:
      | ((value: Awaited<ReturnType<typeof createFormAccessToken>>) => void)
      | undefined;

    vi.mocked(createFormAccessToken).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
    );

    const state = createRuntimeState();
    const first = ensureRuntimeFormAccessJwt(state);
    const second = ensureRuntimeFormAccessJwt(state);

    expect(createFormAccessToken).toHaveBeenCalledTimes(1);

    resolveCreate?.({
      success: true,
      data: {
        token: "joined-token",
        expiresAtUtc: "2030-01-01T00:00:00.000Z",
      },
    });

    await expect(first).resolves.toBe("joined-token");
    await expect(second).resolves.toBe("joined-token");
  });

  it("returns undefined and avoids API call when formId is invalid", async () => {
    const state = createRuntimeState({ formId: "" });

    const token = await ensureRuntimeFormAccessJwt(state);

    expect(token).toBeUndefined();
    expect(createFormAccessToken).not.toHaveBeenCalled();
  });

  it("invalidates cached token fields", () => {
    const state = createRuntimeState({
      formAccessJwt: "cached-token",
      formAccessJwtExpiresAtUtc: "2030-01-01T00:00:00.000Z",
    });

    invalidateRuntimeFormAccessJwt(state);

    expect(state.formAccessJwt).toBeUndefined();
    expect(state.formAccessJwtExpiresAtUtc).toBeUndefined();
  });
});
