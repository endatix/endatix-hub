import { ApiResult, EndatixApi } from "@/lib/endatix-api";
import {
  LatestConversationResponse,
  ConversationMessage
} from "./types";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { Result } from "@/lib/result";

export class Conversations {
  constructor(private baseApi: EndatixApi) {}

  async getLatestConversation(
    formId: string,
  ): Promise<ApiResult<LatestConversationResponse>> {
    const validateFormIdResult = validateEndatixId(formId, "formId");
    if (Result.isError(validateFormIdResult)) {
      return ApiResult.validationError(validateFormIdResult.message);
    }

    return this.baseApi.get<LatestConversationResponse>(
      `/agents/forms/${validateFormIdResult.value}/conversations/latest`,
    );
  }

  async getConversationMessages(
    conversationId: string,
  ): Promise<ApiResult<ConversationMessage[]>> {
    const validateConversationIdResult = validateEndatixId(
      conversationId,
      "conversationId",
    );
    if (Result.isError(validateConversationIdResult)) {
      return ApiResult.validationError(validateConversationIdResult.message);
    }

    return this.baseApi.get<ConversationMessage[]>(
      `/agents/conversations/${validateConversationIdResult.value}/messages`,
    );
  }
}
