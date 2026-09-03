import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { truncateId } from "@/components/common/truncated-id";
import { Result } from "@/lib/result";
import { FormsListSection } from "../forms-list-section";
import type { FormsListResult } from "../../list-forms.server";

const TRACE_ID = "00-15ceb2d6a7b35125152d10c131b11672-28c1e891c501df6c-00";

function fulfilledPromise<T>(value: T): Promise<T> {
  const promise = Promise.resolve(value) as Promise<T> & {
    status: "fulfilled";
    value: T;
  };
  promise.status = "fulfilled";
  promise.value = value;
  return promise;
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/components/table", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/table")>();
  return {
    ...actual,
    useListUrlState: () => ({
      updateUrl: vi.fn(),
      searchParams: new URLSearchParams(),
    }),
  };
});

vi.mock("@/features/forms/ui/forms-list", () => ({
  default: () => <div>forms-list</div>,
}));

vi.mock("@/components/ui/toast", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("FormsListSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function renderSection(formsPromise: Promise<FormsListResult>) {
    return render(
      <Suspense fallback={<div>loading</div>}>
        <FormsListSection
          formsPromise={formsPromise}
          emptyState={<div>empty</div>}
          filteredEmptyState={<div>filtered-empty</div>}
          scope="root"
        />
      </Suspense>,
    );
  }

  it("renders ResultLoadErrorView in the list slot without throwing", async () => {
    // Arrange
    const listResult = Result.validationError(
      "We have a problem",
      "We have a problem",
      "ValidationError",
      { statusCode: 400, traceId: TRACE_ID },
    );

    // Act
    renderSection(fulfilledPromise(listResult));

    // Assert
    expect(
      await screen.findByRole("heading", {
        name: "We could not load this page.",
      }),
    ).toBeDefined();
    expect(screen.getByText(truncateId(TRACE_ID, 8))).toBeDefined();
    expect(screen.queryByText("empty")).toBeNull();
    expect(screen.queryByText("forms-list")).toBeNull();
  });

  it("renders the empty state when the list Result succeeds with no items", async () => {
    // Arrange
    const listResult = Result.success({
      items: [],
      page: 1,
      pageSize: 25,
      totalRecords: 0,
      totalPages: 0,
      hasNextPage: false,
    });

    // Act
    renderSection(fulfilledPromise(listResult));

    // Assert
    expect(await screen.findByText("empty")).toBeDefined();
    expect(
      screen.queryByRole("heading", { name: "We could not load this page." }),
    ).toBeNull();
  });
});
