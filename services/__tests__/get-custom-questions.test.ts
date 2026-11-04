import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCustomQuestions } from "../api";

vi.mock("@/features/auth", () => ({
  getSession: async () => ({ isLoggedIn: true, accessToken: "token" }),
}));

const mockFetch = vi.fn();

function page(items: string[], totalPages: number): Response {
  return Response.json({
    items: items.map((id) => ({ id, name: id })),
    totalPages,
  });
}

function requestedPage(call: unknown[]): string | null {
  return new URL(String(call[0])).searchParams.get("page");
}

describe("getCustomQuestions", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", mockFetch);
    vi.stubEnv("ENDATIX_API_URL", "https://ci.api.endatix.com/api");
    vi.stubEnv("ENDATIX_TRUSTED_PROXIES", "");
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("joins every page in page order", async () => {
    // Arrange
    mockFetch.mockImplementation(async (url: string) => {
      const pageNumber = new URL(url).searchParams.get("page");
      return {
        "1": page(["a", "b"], 3),
        "2": page(["c"], 3),
        "3": page(["d"], 3),
      }[pageNumber ?? ""];
    });

    // Act
    const questions = await getCustomQuestions();

    // Assert
    expect(questions.map((question) => question.id)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
    expect(mockFetch.mock.calls.map((call) => requestedPage(call))).toEqual([
      "1",
      "2",
      "3",
    ]);
  });

  it("fetches one page when there is only one", async () => {
    // Arrange
    mockFetch.mockResolvedValueOnce(page(["a"], 1));

    // Act
    const questions = await getCustomQuestions();

    // Assert
    expect(questions).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("throws when any page fails", async () => {
    // Arrange
    mockFetch
      .mockResolvedValueOnce(page(["a"], 2))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    // Act
    const questions = getCustomQuestions();

    // Assert
    await expect(questions).rejects.toThrow("Failed to fetch custom questions");
  });
});
