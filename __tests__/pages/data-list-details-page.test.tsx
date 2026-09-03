import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Result } from "@/lib/result";

const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const mockGetDataListDetails = vi.fn();
const mockGetDataListItemsPage = vi.fn();
const mockRequireHubAccess = vi.fn().mockResolvedValue(undefined);

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/features/auth/authorization", () => ({
  authorization: vi.fn(),
}));

vi.mock(
  "@/features/data-lists/view-list-details/get-data-list-details.server",
  () => ({
    getDataListDetails: (...args: unknown[]) => mockGetDataListDetails(...args),
  }),
);

vi.mock(
  "@/features/data-lists/view-list-details/get-data-list-items.server",
  () => ({
    getDataListItemsPage: (...args: unknown[]) =>
      mockGetDataListItemsPage(...args),
  }),
);

vi.mock("@/features/data-lists/view-list-details", () => ({
  DataListDetailsPage: () => <div data-testid="data-list-details-page" />,
}));

vi.mock("@/components/error-handling/error-page", () => ({
  HubPageLoadError: ({ result }: { result: { message: string } }) => (
    <div data-testid="hub-page-load-error">{result.message}</div>
  ),
}));

describe("Data list details route page", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { auth } = await import("@/auth");
    const { authorization } = await import("@/features/auth/authorization");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "u1", name: "Test", email: "test@example.com" },
      accessToken: "token",
    } as never);
    vi.mocked(authorization).mockResolvedValue({
      requireHubAccess: mockRequireHubAccess,
    } as never);
  });

  it("calls notFound when details load returns 404", async () => {
    mockGetDataListDetails.mockResolvedValue(
      Result.error("Missing list", undefined, undefined, { statusCode: 404 }),
    );

    const Page = (
      await import("@/app/(main)/data-lists/[dataListId]/page")
    ).default;

    await expect(
      Page({
        params: Promise.resolve({ dataListId: "99" }),
        searchParams: Promise.resolve({} as never),
      }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalledTimes(1);
    expect(mockGetDataListItemsPage).not.toHaveBeenCalled();
  });

  it("renders HubPageLoadError for a non-404 load failure", async () => {
    mockGetDataListDetails.mockResolvedValue(
      Result.error("Failed to load data list.", undefined, undefined, {
        statusCode: 500,
      }),
    );

    const Page = (
      await import("@/app/(main)/data-lists/[dataListId]/page")
    ).default;
    const result = await Page({
      params: Promise.resolve({ dataListId: "99" }),
      searchParams: Promise.resolve({} as never),
    });

    render(result);
    expect(screen.getByTestId("hub-page-load-error").textContent).toBe(
      "Failed to load data list.",
    );
    expect(mockNotFound).not.toHaveBeenCalled();
  });
});
