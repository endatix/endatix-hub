import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  PagedListUrlProvider,
  usePagedListUrl,
} from "../paged-list-url-provider";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => "/forms",
  useSearchParams: () => new URLSearchParams("search=intake&page=2"),
}));

const writers = new Set<unknown>();

function Reader({ name }: Readonly<{ name: string }>) {
  const { updateUrl, search } = usePagedListUrl();
  writers.add(updateUrl);
  return (
    <p>
      {name}:{search}
    </p>
  );
}

describe("PagedListUrlProvider", () => {
  it("gives toolbar and grid the same URL writer", () => {
    render(
      <PagedListUrlProvider>
        <Reader name="toolbar" />
        <Reader name="grid" />
      </PagedListUrlProvider>,
    );

    expect(screen.getByText("toolbar:intake")).toBeTruthy();
    expect(screen.getByText("grid:intake")).toBeTruthy();
    expect(writers.size).toBe(1);
  });

  it("fails loudly outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Reader name="orphan" />)).toThrow(
      /PagedListUrlProvider/,
    );
  });
});
