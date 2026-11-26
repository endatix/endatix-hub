import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PagedTableFooter, type PagedTableFooterProps } from "../paged-table-footer";

it("updates both range labels when the page changes and when its count is refreshed", () => {
  // Arrange
  const props: PagedTableFooterProps = {
    page: 2, pageSize: 10, totalRecords: 25, totalPages: 3, hasNextPage: true,
    entityLabel: "versions", onPageChange: vi.fn(), onPageSizeChange: vi.fn(),
  };
  const { rerender } = render(<PagedTableFooter {...props} />);
  expect(screen.getByText("11-20 of 25")).toBeTruthy();

  // Act & Assert: navigate to the last page, then refresh its reported total.
  const lastPage = { ...props, page: 3, hasNextPage: false };
  rerender(<PagedTableFooter {...lastPage} />);
  expect(screen.getByText("21-25 of 25")).toBeTruthy();
  expect(screen.getByText("Showing 21-25 of 25 versions")).toBeTruthy();
  rerender(<PagedTableFooter {...lastPage} totalRecords={23} />);
  expect(screen.getByText("21-23 of 23")).toBeTruthy();
  expect(screen.getByText("Showing 21-23 of 23 versions")).toBeTruthy();
});
