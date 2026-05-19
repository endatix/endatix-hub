import { describe, expect, it, vi, beforeEach } from "vitest";
import type { FormRuntimeState } from "@/lib/form-runtime/form-runtime.context";
import {
  ensureRuntimeFormAccessJwt,
  invalidateRuntimeFormAccessJwt,
} from "@/lib/form-runtime/form-access-jwt-orchestrator";
import { buildFormAccessTokenBody } from "@/lib/endatix-api/public/forms/form-access-token.shared";
import { createFormAccessToken } from "@/lib/endatix-api/public/forms/form-access-token.client";

vi.mock("@/lib/endatix-api/public/forms/form-access-token.client", () => ({
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

  it("mints a token on demand when ensureRuntimeFormAccessJwt is called", async () => {
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
    expect(createFormAccessToken).toHaveBeenCalledWith(
      "form-1",
      buildFormAccessTokenBody(state),
    );
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

  it("passes legacy token fields to createFormAccessToken body", async () => {
    vi.mocked(createFormAccessToken).mockResolvedValue({
      success: true,
      data: {
        token: "legacy-mint",
        expiresAtUtc: "2030-01-01T00:00:00.000Z",
      },
    });

    const state = createRuntimeState({
      token: "legacy-share-token",
      tokenType: "AccessToken",
    });

    const token = await ensureRuntimeFormAccessJwt(state);

    expect(token).toBe("legacy-mint");
    expect(createFormAccessToken).toHaveBeenCalledWith(
      "form-1",
      buildFormAccessTokenBody(state),
    );
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
