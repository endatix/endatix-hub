import { captureException } from "@/features/analytics/posthog/client";
import { TelemetryLogger } from "@/features/telemetry";
import { SubmissionData } from "@/features/submissions/types";
import { ApiResult } from "@/lib/endatix-api";
import { submitPublicForm } from "../submit-public-form";

const LOGGER_NAME = "submission-queue";

interface QueueItem {
  formId: string;
  data: SubmissionData;
  urlToken?: string;
}

export class SubmissionQueue {
  private queue: QueueItem[] = [];
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
      const itemToProcess = this.queue.shift();
      if (!itemToProcess) {
        return;
      }

      const submitResult = await submitPublicForm(
        itemToProcess.formId,
        itemToProcess.data,
        itemToProcess.urlToken,
      );

      if (ApiResult.isError(submitResult)) {
        TelemetryLogger.error(
          "Partial submission failed",
          undefined,
          {
            form_id: itemToProcess.formId,
            error_type: submitResult.error.type,
            error_code: submitResult.error.errorCode,
          },
          LOGGER_NAME,
        );
      }
    } catch {
      TelemetryLogger.error(
        "Error processing partial submission",
        undefined,
        {
          error_type: "submission_queue_processing_error",
          queue_length: this.queue.length,
        },
        LOGGER_NAME,
      );
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        this.processQueue();
      } else {
        this.notifyIfNotProcessing();
      }
    }
  }

  public enqueue(item: QueueItem): void {
    if (!item.formId || !item.data) {
      const errorMessage = "Submission queue invalid item error";
      const errorData = {
        error_type: "invalid_queue_item",
        has_form_id: !!item.formId,
        has_data: !!item.data,
      };

      console.error(errorMessage, errorData);
      captureException(errorMessage, errorData);
      return;
    }

    this.queue.push(item);
    this.processQueue();
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
