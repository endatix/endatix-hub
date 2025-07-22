import { getSession } from "@/features/auth";
import { ApiErrorType, ApiResult, EndatixApi } from "@/lib/endatix-api";
import { Model } from "survey-core";
import ConversationDetails from "@/features/agents/ui/conversation-details";
import { Suspense } from "react";

interface Params {
  params: Promise<{ agentId: string; conversationId: string }>;
}

export default async function ConversationDetailsPage({ params }: Params) {
  const { agentId, conversationId } = await params;

  return (
    <ConversationDetailsPageContent
      agentId={agentId}
      conversationId={conversationId}
    />
  );
}

async function ConversationDetailsPageContent({
  agentId,
  conversationId,
}: {
  agentId: string;
  conversationId: string;
}) {
  let formModel: string | undefined;
  let formModelError: string | undefined;
  const session = await getSession();
  const endatixApi = new EndatixApi(session);
  const conversationResult = await endatixApi.agents.conversations.get(
    agentId,
    conversationId,
  );

  if (ApiResult.isError(conversationResult)) {
    if (conversationResult.error.type === ApiErrorType.NotFoundError) {
      return <div>Conversation not found</div>;
    }

    return <div>Error: {conversationResult.error.message}</div>;
  }

  try {
    const validatedModel = new Model(conversationResult.data.resultJson);
    formModel = validatedModel.toJSON();
  } catch (error) {
    formModelError = `Cannot parse form model: ${error}`;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConversationDetails
        formModel={formModel}
        formModelError={formModelError}
        conversation={conversationResult.data}
      />
    </Suspense>
  );
}
