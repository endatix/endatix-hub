import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect } from "next/navigation";
import {
  authorization,
  AuthorizationResult,
} from "@/features/auth/authorization";
import { requireHubAccessFactory } from "@/features/auth/authorization/application/authorization-guards";
import type { AuthCheckResult } from "@/features/auth/authorization";
import { Result } from "@/lib/result";
import { resolveDataListItemLabelsAction } from "../resolve-data-list-item-labels.action";
import { searchDataListItemsAction } from "../search-data-list-items.action";

const { mockListItems } = vi.hoisted(() => ({ mockListItems: vi.fn() }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/auth", () => ({ auth: vi.fn().mockResolvedValue(null) }));
vi.mock("@/features/auth/authorization", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/auth/authorization")>()),
  authorization: vi.fn(),
}));
vi.mock("@/lib/endatix-api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/endatix-api")>()),
  EndatixApi: vi.fn(() => ({ dataLists: { listItems: mockListItems } })),
}));

function signedOutViewer(check: AuthCheckResult) {
  const checkPermission = vi.fn().mockResolvedValue(check);
  vi.mocked(authorization).mockResolvedValue({
    checkPermission,
    requireHubAccess: requireHubAccessFactory(checkPermission),
  } as unknown as Awaited<ReturnType<typeof authorization>>);
}

describe("designer data-list actions without a session", () => {
  beforeEach(() => {
    vi.mocked(redirect).mockClear();
    mockListItems.mockReset();
  });

  it.each([
    ["a lost session", AuthorizationResult.unauthenticated()],
    ["no Hub access", AuthorizationResult.forbidden()],
  ])(
    "returns an error from the item search on %s instead of navigating",
    async (_case, check) => {
      signedOutViewer(check);

      const result = await searchDataListItemsAction("42", {
        skip: 0,
        take: 25,
      });

      expect(Result.isError(result)).toBe(true);
      expect(redirect).not.toHaveBeenCalled();
      expect(mockListItems).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["a lost session", AuthorizationResult.unauthenticated()],
    ["no Hub access", AuthorizationResult.forbidden()],
  ])(
    "returns an error from the label lookup on %s instead of navigating",
    async (_case, check) => {
      signedOutViewer(check);

      const result = await resolveDataListItemLabelsAction("42", ["a"]);

      expect(Result.isError(result)).toBe(true);
      expect(redirect).not.toHaveBeenCalled();
      expect(mockListItems).not.toHaveBeenCalled();
    },
  );
});
