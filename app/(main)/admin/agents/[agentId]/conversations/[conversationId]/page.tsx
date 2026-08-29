import { getSession } from "@/features/auth";
import { EndatixApi } from "@/lib/endatix-api";
import { Model } from "survey-core";
import ConversationDetails from "@/features/agents/ui/conversation-details";
import { Suspense } from "react";
import { requireAdmin } from "@/components/admin-ui/admin-protection";
import { HubPageLoadError } from "@/components/error-handling/error-page";
import { NotFoundComponent } from "@/components/error-handling/not-found";
import { Result, toResult } from "@/lib/result";

interface Params {
  params: Promise<{ agentId: string; conversationId: string }>;
}

export default async function ConversationDetailsPage({ params }: Params) {
  await requireAdmin();

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
  const conversationResult = toResult(
    await endatixApi.agents.conversations.get(agentId, conversationId),
    {
      fallbackMessage: "Failed to load conversation.",
      logMessage: "Failed to load agent conversation.",
      loggerName: "admin.agents",
    },
  );

  if (Result.isError(conversationResult)) {
    if (conversationResult.statusCode === 404) {
      return (
        <NotFoundComponent
          notFoundTitle="Conversation not found"
          notFoundSubtitle="We couldn't find that conversation."
          notFoundMessage="It may have been deleted, or the ID in the URL is wrong."
        />
      );
    }

    return <HubPageLoadError result={conversationResult} />;
  }

  try {
    const validatedModel = new Model(conversationResult.value.resultJson);
    formModel = validatedModel.toJSON();
  } catch (error) {
    formModelError = `Cannot parse form model: ${error}`;
  }

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ConversationDetails
        formModel={formModel}
        formModelError={formModelError}
        conversation={conversationResult.value}
      />
    </Suspense>
  );
}
