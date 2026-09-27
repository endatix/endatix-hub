import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import { Result } from "@/lib/result";
import type { PlatformAdminSession } from "../../types";
import { listSignupRequests } from "../list-signup-requests.server";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/endatix-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/endatix-api")>();
  return { ...actual, EndatixApi: vi.fn() };
});

const session = { accessToken: "token" } as PlatformAdminSession;
const request = { page: 1, pageSize: 20, status: "pending" as const };

describe("listSignupRequests", () => {
  const list = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(EndatixApi).mockImplementation(function () {
      return { signupRequests: { list } } as never;
    });
  });

  it("returns an empty page when the inbox treats a missing route as empty", async () => {
    list.mockResolvedValue(ApiResult.notFoundError());

    const result = await listSignupRequests(session, request, {
      notFoundAsEmpty: true,
    });

    expect(Result.isSuccess(result) && result.value.totalRecords).toBe(0);
  });

  it("returns a failure when a missing route must not look like zero", async () => {
    list.mockResolvedValue(ApiResult.notFoundError());

    const result = await listSignupRequests(session, request);

    expect(Result.isError(result)).toBe(true);
  });
});
