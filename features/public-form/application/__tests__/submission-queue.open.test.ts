import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import { SubmissionQueue } from "../submission-queue/submission-queue";
import { submitPublicForm } from "../submit-public-form";
import { openPublicForm } from "../open-public-form";
import { captureException } from "@/features/analytics/posthog/client";
import { ApiResult } from "@/lib/endatix-api";

vi.mock("../submit-public-form", () => ({ submitPublicForm: vi.fn() }));
vi.mock("../open-public-form", () => ({ openPublicForm: vi.fn() }));
vi.mock("@/features/analytics/posthog/client", () => ({
  captureException: vi.fn(),
}));

describe("SubmissionQueue open", () => {
  let queue: SubmissionQueue;
  const submit = submitPublicForm as Mock;
  const open = openPublicForm as Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    queue = new SubmissionQueue();
  });

  it("finishes the open before a save enqueued after it starts", async () => {
    const calls: string[] = [];
    let finishOpen: (value: unknown) => void = () => {};
    open.mockImplementation(
      () =>
        new Promise((resolve) => {
          calls.push("open");
          finishOpen = () => resolve(ApiResult.success({ submissionId: "42" }));
        }),
    );
    submit.mockImplementation(async () => {
      calls.push("save");
      return ApiResult.success({ submissionId: "42" });
    });

    queue.enqueueOpen({ formId: "1", urlToken: "t", onOpened: vi.fn() });
    queue.enqueue({ formId: "1", data: { jsonData: "{}", isComplete: false } });
    expect(calls).toEqual(["open"]);
    finishOpen(undefined);
    await queue.waitWhileProcessing();
    await vi.waitFor(() => expect(calls).toEqual(["open", "save"]));

    expect(open).toHaveBeenCalledWith("1", "t");
  });

  it("hands the opened submission to the caller", async () => {
    open.mockResolvedValue(ApiResult.success({ submissionId: "42" }));
    const onOpened = vi.fn();

    queue.enqueueOpen({ formId: "1", onOpened });
    await vi.waitFor(() =>
      expect(onOpened).toHaveBeenCalledWith({ submissionId: "42" }),
    );
  });

  it("reports a failed open and keeps the queue going", async () => {
    open.mockResolvedValue(
      ApiResult.validationError("nope", "submission_token_invalid"),
    );
    submit.mockResolvedValue(ApiResult.success({ submissionId: "42" }));
    const onOpened = vi.fn();

    queue.enqueueOpen({ formId: "1", onOpened });
    queue.enqueue({ formId: "1", data: { jsonData: "{}", isComplete: false } });

    await vi.waitFor(() => expect(submit).toHaveBeenCalled());
    expect(onOpened).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledWith(
      "Open submission failed",
      expect.objectContaining({ form_id: "1" }),
    );
  });
});
