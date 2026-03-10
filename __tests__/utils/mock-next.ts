import { vi } from "vitest";

/**
 * Factory for next/navigation mocks. Use in vi.mock("next/navigation", () => createNextNavigationMock()).
 * Vitest hoists vi.mock, so call this only inside the mock factory.
 */
export function createNextNavigationMock(
  overrides: Partial<{
    useRouter: ReturnType<typeof vi.fn>;
    usePathname: ReturnType<typeof vi.fn>;
    useSearchParams: ReturnType<typeof vi.fn>;
    redirect: ReturnType<typeof vi.fn>;
    notFound: ReturnType<typeof vi.fn>;
    forbidden: ReturnType<typeof vi.fn>;
  }> = {},
) {
  return {
    useRouter: overrides.useRouter ?? vi.fn(),
    usePathname: overrides.usePathname ?? vi.fn(),
    useSearchParams: overrides.useSearchParams ?? vi.fn(),
    redirect: overrides.redirect ?? vi.fn(),
    notFound: overrides.notFound ?? vi.fn(),
    forbidden: overrides.forbidden ?? vi.fn(),
  };
}

/**
 * Factory for @/auth mock. Use in vi.mock("@/auth", () => createAuthMock()).
 */
export function createAuthMock(
  overrides: Partial<{ auth: ReturnType<typeof vi.fn> }> = {},
) {
  return {
    auth: overrides.auth ?? vi.fn(),
  };
}

/**
 * Factory for next/headers mocks. Use in vi.mock("next/headers", () => createNextHeadersMock()).
 */
export function createNextHeadersMock(
  overrides: Partial<{
    cookies: ReturnType<typeof vi.fn>;
    headers: ReturnType<typeof vi.fn>;
  }> = {},
) {
  return {
    cookies: overrides.cookies ?? vi.fn().mockResolvedValue({}),
    headers: overrides.headers ?? vi.fn(),
  };
}
