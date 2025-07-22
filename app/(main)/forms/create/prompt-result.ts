import { ApiResult } from "@/lib/endatix-api/types";
import { DefineFormResponse } from "@/lib/endatix-api/agents/types";

export type PromptResult = ApiResult<DefineFormResponse>;

// Helper functions for managing PromptResult state
// Usage examples:
// - const initialState = PromptResult.InitialState();
// - const success = PromptResult.Success(responseData);
// - const error = PromptResult.Error("Something went wrong");
// - const isError = PromptResult.isError(result);
// - const errorMsg = PromptResult.getErrorMessage(result);
export const PromptResult = {
  /**
   * Creates the initial state for useActionState
   */
  InitialState(): PromptResult {
    return ApiResult.success({
      agentResponse: "",
      agentId: "",
      threadId: "",
      definition: undefined
    });
  },

  /**
   * Creates a success state
   */
  Success(data: DefineFormResponse): PromptResult {
    return ApiResult.success(data);
  },

  /**
   * Creates an error state
   */
  Error(message: string): PromptResult {
    return ApiResult.validationError(message);
  },

  /**
   * Creates a loading state (same as initial for simplicity)
   */
  Loading(): PromptResult {
    return PromptResult.InitialState();
  },

  /**
   * Checks if the result is an error
   */
  isError(result: PromptResult): boolean {
    return !result.success;
  },

  /**
   * Gets the error message from a result
   */
  getErrorMessage(result: PromptResult): string | undefined {
    return result.success ? undefined : result.error.message;
  }
};
