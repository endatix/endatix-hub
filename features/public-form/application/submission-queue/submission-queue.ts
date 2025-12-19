import { captureException } from "@/features/analytics/posthog/client";
import { SubmissionData } from "@/features/submissions/types";
import { submitFormAction } from "../actions/submit-form.action";
import { ApiResult } from "@/lib/endatix-api";

interface QueueItem {
  formId: string;
  data: SubmissionData;
  urlToken?: string;
}

export class SubmissionQueue {
  private queue: QueueItem[] = [];
  private isProcessing = false;

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

      const submitResult = await submitFormAction(
        itemToProcess.formId,
        itemToProcess.data,
        itemToProcess.urlToken,
      );

      if (ApiResult.isError(submitResult)) {
        const errorMessage = "Failed to submit form";
        const errorData = {
          form_id: itemToProcess.formId,
          error_message: submitResult.error.message,
        };

        console.error(errorMessage, submitResult.error.message);
        captureException("Form submission failed", errorData);
      }
    } catch (error) {
      const errorMessage = "Error processing partial submission:";
      const errorData = {
        error_type: "submission_queue_processing_error",
        queue_length: this.queue.length,
      };

      console.error(errorMessage, error);
      captureException(error, errorData);
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        this.processQueue();
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

  public get processing(): boolean {
    return this.isProcessing;
  }

  public get queueLength(): number {
    return this.queue.length;
  }
}

export const submissionQueue = new SubmissionQueue();
