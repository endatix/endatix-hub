import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudiencePeopleTestFilter } from "@/lib/endatix-api/audience/types";
import { stubPhoneWidth } from "@/test/stubs/phone-width";
import { CLEAR_PEOPLE_FILTERS } from "../parse-people-page";
import { PeopleToolbar } from "../ui/people-toolbar";

const url = vi.hoisted(() => ({
  updateUrl: vi.fn(),
  setSearch: vi.fn(),
  search: "",
}));

vi.mock("@/components/table", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/table")>()),
  useListUrlState: () => ({
    search: url.search,
    setSearch: url.setSearch,
    updateUrl: url.updateUrl,
  }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/forms/1/audience",
  useSearchParams: () => new URLSearchParams(),
}));

describe("PeopleToolbar on a phone", () => {
  beforeEach(() => {
    stubPhoneWidth();
    url.search = "";
  });

  it("counts the Test filter and labels it in the Filters drawer", () => {
    // Arrange
    render(<PeopleToolbar testFilter={AudiencePeopleTestFilter.Test} />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Filters · 1" }));

    // Assert
    const drawer = screen.getByRole("dialog", { name: "Filters" });
    expect(within(drawer).getByLabelText("Real or test").textContent).toContain(
      "Test participants",
    );
  });

  it("shows no count and no Reset on the default view", () => {
    // Arrange & Act
    render(<PeopleToolbar testFilter={AudiencePeopleTestFilter.All} />);

    // Assert
    expect(screen.getByRole("button", { name: "Filters" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /reset/i })).toBeNull();
  });

  it("clears the search and the Test filter like the empty state, from the toolbar and the drawer", () => {
    // Arrange
    url.search = "ada";
    render(<PeopleToolbar testFilter={AudiencePeopleTestFilter.Real} />);

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Reset Filters" }));
    fireEvent.click(screen.getByRole("button", { name: "Filters · 1" }));
    fireEvent.click(
      within(screen.getByRole("dialog", { name: "Filters" })).getByRole(
        "button",
        { name: "Reset" },
      ),
    );

    // Assert
    expect(url.updateUrl.mock.calls).toEqual([
      [CLEAR_PEOPLE_FILTERS],
      [CLEAR_PEOPLE_FILTERS],
    ]);
    expect(url.setSearch).toHaveBeenCalledWith("");
  });
});
