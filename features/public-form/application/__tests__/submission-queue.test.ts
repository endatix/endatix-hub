import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { SubmissionQueue } from "../submission-queue/submission-queue";
import { submitFormAction } from "../actions/submit-form.action";
import { Result } from "@/lib/result";
import { captureException } from "@/features/analytics/posthog/client";

// Mock the submitFormAction and captureException
vi.mock("../actions/submit-form.action", () => ({
  submitFormAction: vi.fn(),
}));

vi.mock("@/features/analytics/posthog/client", () => ({
  captureException: vi.fn(),
}));

describe("SubmissionQueue", () => {
  let queue: SubmissionQueue;
  const mockSubmitForm = submitFormAction as Mock;
  const mockCaptureException = captureException as Mock;

  beforeEach(() => {
    queue = new SubmissionQueue();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("should process items in queue sequentially", async () => {
    // Arrange
    mockSubmitForm.mockResolvedValueOnce(Result.success({ isSuccess: true }));
    mockSubmitForm.mockResolvedValueOnce(Result.success({ isSuccess: true }));

    const items = [
      {
        formId: "1",
        data: {
          jsonData: '{"test": 1}',
          isComplete: false,
          currentPage: 0,
        },
      },
      {
        formId: "2",
        data: {
          jsonData: '{"test": 2}',
          isComplete: false,
          currentPage: 1,
        },
      },
    ];

    // Act
    items.forEach((item) => queue.enqueue(item));
    await vi.runAllTimersAsync();

    // Assert
    expect(mockSubmitForm).toHaveBeenCalledTimes(2);
    expect(mockSubmitForm).toHaveBeenNthCalledWith(
      1,
      items[0].formId,
      items[0].data,
    );
    expect(mockSubmitForm).toHaveBeenNthCalledWith(
      2,
      items[1].formId,
      items[1].data,
    );
  });

  it("should not process new items while processing current item", async () => {
    // Arrange
    let resolveFirst: (value: unknown) => void;
    const firstSubmission = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    mockSubmitForm.mockImplementationOnce(() => firstSubmission);
    mockSubmitForm.mockResolvedValueOnce(Result.success({ isSuccess: true }));

    // Act
    queue.enqueue({
      formId: "1",
      data: {
        jsonData: '{"test": 1}',
        isComplete: false,
        currentPage: 0,
      },
    });

    // Start processing first item
    vi.runAllTimers();

    queue.enqueue({
      formId: "2",
      data: {
        jsonData: '{"test": 2}',
        isComplete: false,
        currentPage: 1,
      },
    });

    // Assert
    expect(mockSubmitForm).toHaveBeenCalledTimes(1);

    // Complete first submission
    resolveFirst!(Result.success({ isSuccess: true }));
    await vi.runAllTimersAsync();

    expect(mockSubmitForm).toHaveBeenCalledTimes(2);
  });

  it("should handle submission errors and continue processing", async () => {
    // Arrange
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Network error");
    mockSubmitForm.mockRejectedValueOnce(error);
    mockSubmitForm.mockResolvedValueOnce(Result.success({ isSuccess: true }));

    // Act
    queue.enqueue({
      formId: "1",
      data: {
        jsonData: '{"test": 1}',
        isComplete: false,
        currentPage: 0,
      },
    });

    queue.enqueue({
      formId: "2",
      data: {
        jsonData: '{"test": 2}',
        isComplete: false,
        currentPage: 1,
      },
    });

    await vi.runAllTimersAsync();

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error processing partial submission:",
      expect.any(Error),
    );
    expect(mockCaptureException).toHaveBeenCalledWith(error, {
      error_type: "submission_queue_processing_error",
      queue_length: expect.any(Number),
    });
    expect(mockSubmitForm).toHaveBeenCalledTimes(2);
  });

  it("should clear queue and stop processing", async () => {
    // Arrange
    mockSubmitForm.mockResolvedValue(Result.success({ isSuccess: true }));

    // Act
    queue.enqueue({
      formId: "1",
      data: {
        jsonData: '{"test": 1}',
        isComplete: false,
        currentPage: 0,
      },
    });

    queue.enqueue({
      formId: "2",
      data: {
        jsonData: '{"test": 2}',
        isComplete: false,
        currentPage: 1,
      },
    });

    queue.clear();
    await vi.runAllTimersAsync();

    // Assert
    expect(mockSubmitForm).toHaveBeenCalledTimes(1); // Only one item was submitted before clearing the queue
    expect(queue.queueLength).toBe(0);
  });

  it("should handle failed submissions with Result.error", async () => {
    // Arrange
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const errorMessage = "Submission failed";
    mockSubmitForm.mockResolvedValue(Result.error(errorMessage));

    // Act
    queue.enqueue({
      formId: "1",
      data: {
        jsonData: '{"test": 1}',
        isComplete: false,
        currentPage: 0,
      },
    });

    await vi.runAllTimersAsync();

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to submit form",
      errorMessage,
    );
    expect(mockCaptureException).toHaveBeenCalledWith("Form submission failed", {
      form_id: "1",
      error_message: errorMessage,
    });
  });

  it("should process items added while processing previous items", async () => {
    // Arrange
    mockSubmitForm.mockImplementation(() =>
      Promise.resolve(Result.success({ isSuccess: true })),
    );

    // Act
    queue.enqueue({
      formId: "1",
      data: {
        jsonData: '{"test": 1}',
        isComplete: false,
        currentPage: 0,
      },
    });

    await vi.runAllTimersAsync();

    queue.enqueue({
      formId: "2",
      data: {
        jsonData: '{"test": 2}',
        isComplete: false,
        currentPage: 1,
      },
    });

    await vi.runAllTimersAsync();

    // Assert
    expect(mockSubmitForm).toHaveBeenCalledTimes(2);
  });
});
