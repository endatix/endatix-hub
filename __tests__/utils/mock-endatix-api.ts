import { vi } from "vitest";

const emptyPagedResponse = {
  items: [],
  page: 1,
  pageSize: 10,
  totalPages: 0,
  totalRecords: 0,
};

/**
 * Default stub instance for EndatixApi mock. Covers namespaces used by page/API tests.
 * Merge with overrides so tests only need to provide what they care about.
 */
function defaultEndatixApiInstance() {
  return {
    users: {
      list: vi
        .fn()
        .mockResolvedValue({ success: true, data: emptyPagedResponse }),
    },
    auth: {
      getInviteDetails: vi.fn().mockResolvedValue({
        success: true,
        data: { email: "invitee@example.com" },
      }),
      getAuthorizationData: vi.fn(),
    },
    roles: {
      list: vi
        .fn()
        .mockResolvedValue({ success: true, data: emptyPagedResponse }),
      listPermissions: vi.fn().mockResolvedValue({ success: true, data: [] }),
    },
    myAccount: {
      changePassword: vi.fn(),
    },
    submissions: {
      public: {
        create: vi.fn(),
        updateByToken: vi.fn(),
        getByToken: vi.fn(),
      },
    },
  };
}

export type EndatixApiInstanceOverrides = ReturnType<
  typeof defaultEndatixApiInstance
>;

/**
 * Factory for EndatixApi module mock. Use in vi.mock("@/lib/endatix-api", ...).
 *
 * - Full mock: vi.mock("@/lib/endatix-api", () => createEndatixApiMock())
 * - Partial mock (keep ApiResult, types, etc.): vi.mock("@/lib/endatix-api", async (importOriginal) => {
 *     const mod = await importOriginal<typeof import('@/lib/endatix-api')>();
 *     return { ...mod, ...createEndatixApiMock() };
 *   });
 *
 * Vitest 4: constructor mock must use function (not arrow). Override in beforeEach with
 * vi.mocked(EndatixApi).mockImplementation(function () { return { ... }; }) if needed.
 */
export function createEndatixApiMock(
  instanceOverrides: Partial<EndatixApiInstanceOverrides> = {},
) {
  const instance = {
    ...defaultEndatixApiInstance(),
    ...instanceOverrides,
  };
  return {
    EndatixApi: vi.fn().mockImplementation(function () {
      return instance;
    }),
  };
}
