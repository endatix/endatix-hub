import { Result } from "@/lib/result";
import { captureException } from "@/features/analytics/posthog/client";
import { SubmissionData } from "@/features/submissions/types";
import { submitFormAction } from "../actions/submit-form.action";

interface QueueItem {
  formId: string;
  data: SubmissionData;
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

      const result = await submitFormAction(
        itemToProcess.formId,
        itemToProcess.data,
      );

      if (Result.isError(result)) {
        const errorMessage = "Failed to submit form";
        const errorData = {
          form_id: itemToProcess.formId,
          error_message: result.message,
        };

        console.error(errorMessage, result.message);
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
