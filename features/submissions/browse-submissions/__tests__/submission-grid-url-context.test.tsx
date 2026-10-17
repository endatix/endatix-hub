import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SubmissionGridColumn } from "@/lib/endatix-api/reporting/submission-grid-types";
import { toAnswerColumns } from "../submission-grid-columns";
import {
  SubmissionGridUrlProvider,
  useSubmissionGridUrl,
} from "../ui/submission-grid-url-context";

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/forms/5/submissions",
  useSearchParams: () => searchParams,
}));

function textColumn(key: string): SubmissionGridColumn {
  return {
    key,
    kind: "Simple",
    title: key,
    questionType: "text",
    filterType: "text",
    pageName: null,
    pageTitle: null,
    panelTitle: null,
  };
}

function renderGridUrl(columns: SubmissionGridColumn[]) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <SubmissionGridUrlProvider catalog={toAnswerColumns(columns)}>
      {children}
    </SubmissionGridUrlProvider>
  );
  return renderHook(() => useSubmissionGridUrl(), { wrapper });
}

describe("SubmissionGridUrlProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replace.mockClear();
    searchParams = new URLSearchParams();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("commits two quick answer filter edits together", () => {
    // Arrange
    const { result } = renderGridUrl([textColumn("q1"), textColumn("q2")]);

    // Act
    act(() => result.current.setTextFilter("answer.contains.q1", "acme"));
    act(() => vi.advanceTimersByTime(200));
    act(() => result.current.setTextFilter("answer.contains.q2", "berlin"));
    act(() => vi.advanceTimersByTime(350));

    // Assert
    expect(replace).toHaveBeenCalledTimes(1);
    const query = new URL(replace.mock.calls[0][0], "https://hub.test")
      .searchParams;
    expect(query.get("answer.contains.q1")).toBe("acme");
    expect(query.get("answer.contains.q2")).toBe("berlin");
  });

  it("commits an answer filter and a submitter filter together", () => {
    // Arrange
    const { result } = renderGridUrl([textColumn("q1")]);

    // Act
    act(() => result.current.setTextFilter("submitterEmail", "a@b.c"));
    act(() => result.current.setTextFilter("answer.contains.q1", "acme"));
    act(() => vi.advanceTimersByTime(350));

    // Assert
    expect(replace).toHaveBeenCalledTimes(1);
    const query = new URL(replace.mock.calls[0][0], "https://hub.test")
      .searchParams;
    expect(query.get("submitterEmail")).toBe("a@b.c");
    expect(query.get("answer.contains.q1")).toBe("acme");
  });

  it("keeps an uncommitted edit when a new catalog with the same keys arrives", () => {
    // Arrange
    let catalog = [textColumn("q1")];
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SubmissionGridUrlProvider catalog={toAnswerColumns(catalog)}>
        {children}
      </SubmissionGridUrlProvider>
    );
    const { result, rerender } = renderHook(() => useSubmissionGridUrl(), {
      wrapper,
    });

    // Act
    act(() => result.current.setTextFilter("answer.contains.q1", "acme"));
    catalog = [textColumn("q1")];
    rerender();

    // Assert
    expect(result.current.textFilters["answer.contains.q1"]).toBe("acme");
  });

  it("reads answer filters back from the URL", () => {
    // Arrange
    searchParams = new URLSearchParams("answer.contains.q1=acme");

    // Act
    const { result } = renderGridUrl([textColumn("q1")]);

    // Assert
    expect(result.current.urlState.answerFilters).toEqual([
      { operator: "contains", key: "q1", value: "acme" },
    ]);
    expect(result.current.textFilters["answer.contains.q1"]).toBe("acme");
  });
});
