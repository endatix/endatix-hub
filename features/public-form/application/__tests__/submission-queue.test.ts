import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";
import { SubmissionQueue } from "../submission-queue/submission-queue";
import { submitPublicForm } from "../submit-public-form";
import { captureException } from "@/features/analytics/posthog/client";
import { ApiResult, ERROR_CODE } from "@/lib/endatix-api";

// Mock the submitPublicForm and captureException
vi.mock("../submit-public-form", () => ({
  submitPublicForm: vi.fn(),
}));

vi.mock("@/features/analytics/posthog/client", () => ({
  captureException: vi.fn(),
}));

describe("SubmissionQueue", () => {
  let queue: SubmissionQueue;
  const mockSubmitForm = submitPublicForm as Mock;
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
    mockSubmitForm.mockResolvedValueOnce(
      ApiResult.success({ isSuccess: true }),
    );
    mockSubmitForm.mockResolvedValueOnce(
      ApiResult.success({ isSuccess: true }),
    );

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
      undefined, // urlToken
    );
    expect(mockSubmitForm).toHaveBeenNthCalledWith(
      2,
      items[1].formId,
      items[1].data,
      undefined, // urlToken
    );
  });

  it("should not process new items while processing current item", async () => {
    // Arrange
    let resolveFirst: (value: unknown) => void;
    const firstSubmission = new Promise((resolve) => {
      resolveFirst = resolve;
    });

    mockSubmitForm.mockImplementationOnce(() => firstSubmission);
    mockSubmitForm.mockResolvedValueOnce(
      ApiResult.success({ isSuccess: true }),
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
    resolveFirst!(ApiResult.success({ isSuccess: true }));
    await vi.runAllTimersAsync();

    expect(mockSubmitForm).toHaveBeenCalledTimes(2);
  });

  it("should handle submission errors and continue processing", async () => {
    // Arrange
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Network error");
    mockSubmitForm.mockRejectedValueOnce(error);
    mockSubmitForm.mockResolvedValueOnce(
      ApiResult.success({ isSuccess: true }),
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
    mockSubmitForm.mockResolvedValue(ApiResult.success({ isSuccess: true }));

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

  it("should handle submission token invalid error properly", async () => {
    // Arrange
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const errorMessage = "Your submission session has expired.";
    mockSubmitForm.mockResolvedValue(
      ApiResult.validationError(
        errorMessage,
        ERROR_CODE.SUBMISSION_TOKEN_INVALID,
      ),
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

    // Assert
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to submit form",
      errorMessage,
    );
    expect(mockCaptureException).toHaveBeenCalledWith(
      "Form submission failed",
      {
        form_id: "1",
        error_message: errorMessage,
      },
    );
  });

  it("should process items added while processing previous items", async () => {
    // Arrange
    mockSubmitForm.mockImplementation(() =>
      Promise.resolve(ApiResult.success({ isSuccess: true })),
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

  it("should resolve waitWhileProcessing immediately when nothing is in flight", async () => {
    // Arrange
    // Act
    await queue.waitWhileProcessing();

    // Assert
    await expect(queue.waitWhileProcessing()).resolves.toBeUndefined();
  });

  it("should resolve waitWhileProcessing after in-flight partial completes", async () => {
    // Arrange
    let resolveFirst: (value: unknown) => void;
    const firstSubmission = new Promise((resolve) => {
      resolveFirst = resolve;
    });
    mockSubmitForm.mockImplementationOnce(() => firstSubmission);

    queue.enqueue({
      formId: "1",
      data: {
        jsonData: '{"test": 1}',
        isComplete: false,
        currentPage: 0,
      },
    });

    vi.runAllTimers();

    const processingPromise = queue.waitWhileProcessing();
    let processingResolved = false;
    void processingPromise.then(() => {
      processingResolved = true;
    });

    // Assert
    expect(processingResolved).toBe(false);

    // Act
    resolveFirst!(ApiResult.success({ submissionId: "sub-1" }));
    await vi.runAllTimersAsync();

    // Assert
    await expect(processingPromise).resolves.toBeUndefined();
  });
});
