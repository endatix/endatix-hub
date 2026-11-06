import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { submissionQueue } from "../submission-queue/submission-queue";
import { useRecordOpen } from "../submission-queue/use-record-open.hook";

vi.mock("../submission-queue/submission-queue", () => ({
  submissionQueue: { enqueueOpen: vi.fn() },
}));

describe("useRecordOpen", () => {
  const enqueueOpen = submissionQueue.enqueueOpen as ReturnType<typeof vi.fn>;

  beforeEach(() => enqueueOpen.mockClear());

  it("queues the open once per page view, however often the page re-renders", () => {
    const onOpened = vi.fn();
    const { rerender } = renderHook(
      ({ token }) =>
        useRecordOpen({
          formId: "1",
          urlToken: token,
          isFinished: false,
          onOpened,
        }),
      { initialProps: { token: "t" as string | undefined } },
    );
    rerender({ token: "t" });
    rerender({ token: undefined });

    expect(enqueueOpen).toHaveBeenCalledTimes(1);
    expect(enqueueOpen).toHaveBeenCalledWith({
      formId: "1",
      urlToken: "t",
      onOpened,
    });
  });

  it("records nothing for a finished submission", () => {
    renderHook(() =>
      useRecordOpen({
        formId: "1",
        urlToken: undefined,
        isFinished: true,
        onOpened: vi.fn(),
      }),
    );

    expect(enqueueOpen).not.toHaveBeenCalled();
  });
});
