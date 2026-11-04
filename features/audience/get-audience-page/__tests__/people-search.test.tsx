import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AudiencePeopleTestFilter } from "@/lib/endatix-api/audience/types";
import { PeopleEmpty } from "../ui/people-empty";
import { PeopleToolbar } from "../ui/people-toolbar";

const { replace, url } = vi.hoisted(() => ({
  replace: vi.fn(),
  url: { query: "" },
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/forms/1/audience",
  useSearchParams: () => new URLSearchParams(url.query),
}));

const searchBox = () =>
  screen.getByRole("textbox", {
    name: "Search participants by identifier",
  }) as HTMLInputElement;

describe("Participants search", () => {
  beforeEach(() => {
    replace.mockReset();
    url.query = "test=real";
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts from the URL's search, so Back restores it", () => {
    // Arrange
    url.query = "search=acme";

    // Act
    render(<PeopleToolbar testFilter={AudiencePeopleTestFilter.All} />);

    // Assert
    expect(searchBox().value).toBe("acme");
  });

  it("puts the search in the URL, from the first page, keeping the filter", () => {
    // Arrange
    vi.useFakeTimers();
    render(<PeopleToolbar testFilter={AudiencePeopleTestFilter.Real} />);

    // Act
    fireEvent.change(searchBox(), { target: { value: " acme " } });
    act(() => vi.advanceTimersByTime(400));

    // Assert
    expect(replace).toHaveBeenCalledTimes(1);
    const next = new URL(replace.mock.calls[0][0], "http://hub");
    expect(next.searchParams.get("search")).toBe("acme");
    expect(next.searchParams.get("page")).toBe("1");
    expect(next.searchParams.get("test")).toBe("real");
  });

  it("says the search found nobody, and Clear filters drops the search and the filter", () => {
    // Arrange
    url.query = "search=nobody&test=real&page=2";
    render(
      <PeopleEmpty
        testFilter={AudiencePeopleTestFilter.Real}
        search="nobody"
      />,
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    // Assert
    expect(screen.getByText("No participants match")).toBeTruthy();
    const next = new URL(replace.mock.calls[0][0], "http://hub");
    expect(next.searchParams.has("search")).toBe(false);
    expect(next.searchParams.has("test")).toBe(false);
    expect(next.searchParams.get("page")).toBe("1");
  });
});
