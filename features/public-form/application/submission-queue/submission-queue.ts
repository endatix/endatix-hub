import { captureException } from "@/features/analytics/posthog/client";
import { SubmissionData } from "@/features/submissions/types";
import { ApiResult } from "@/lib/endatix-api";
import { openPublicForm } from "../open-public-form";
import { submitPublicForm } from "../submit-public-form";
import type {
  SubmissionOperation,
  SubmissionOperationResult,
} from "../submit-form-operation";

interface QueueItem {
  formId: string;
  data: SubmissionData;
  urlToken?: string;
}

/** The respondent's open: it runs before any save queued after it, so they don't both create. */
interface OpenItem {
  formId: string;
  urlToken?: string;
  onOpened: (opened: SubmissionOperation) => void;
}

interface QueueJob {
  formId: string;
  failure: string;
  run: () => Promise<SubmissionOperationResult>;
  onSuccess?: (result: SubmissionOperation) => void;
}

export class SubmissionQueue {
  private queue: QueueJob[] = [];
  private isProcessing = false;
  private processingResolvers: Array<() => void> = [];

  private notifyIfNotProcessing(): void {
    if (!this.isProcessing) {
      const resolvers = this.processingResolvers.splice(0);
      for (const resolve of resolvers) {
        resolve();
      }
    }
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    try {
      const job = this.queue.shift();
      if (!job) {
        return;
      }

      const result = await job.run();
      if (ApiResult.isError(result)) {
        captureException(job.failure, {
          form_id: job.formId,
          error_type: result.error.type,
          error_code: result.error.errorCode ?? "unknown",
        });
      } else {
        job.onSuccess?.(result.data);
      }
    } catch {
      captureException("Error processing partial submission", {
        error_type: "submission_queue_processing_error",
        queue_length: this.queue.length,
      });
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        void this.processQueue();
      } else {
        this.notifyIfNotProcessing();
      }
    }
  }

  public enqueue(item: QueueItem): void {
    if (!item.formId || !item.data) {
      captureException("Submission queue invalid item error", {
        error_type: "invalid_queue_item",
        has_form_id: !!item.formId,
        has_data: !!item.data,
      });
      return;
    }

    this.queue.push({
      formId: item.formId,
      failure: "Partial submission failed",
      run: () => submitPublicForm(item.formId, item.data, item.urlToken),
    });
    void this.processQueue();
  }

  public enqueueOpen(item: OpenItem): void {
    this.queue.push({
      formId: item.formId,
      failure: "Open submission failed",
      run: () => openPublicForm(item.formId, item.urlToken),
      onSuccess: item.onOpened,
    });
    void this.processQueue();
  }

  public clear(): void {
    this.queue = [];
  }

  public waitWhileProcessing(): Promise<void> {
    if (!this.isProcessing) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      this.processingResolvers.push(resolve);
    });
  }

  public get processing(): boolean {
    return this.isProcessing;
  }

  public get queueLength(): number {
    return this.queue.length;
  }
}

export const submissionQueue = new SubmissionQueue();
