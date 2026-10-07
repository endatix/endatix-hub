"use client";

import { publicStatusClassNames } from "@/components/public-status/public-status-page";
import { startNewResponseAction } from "@/features/public-form/application/actions/start-new-response.action";
import { Result } from "@/lib/result";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

interface StartNewResponseButtonProps {
  formId: string;
}

export function StartNewResponseButton({
  formId,
}: Readonly<StartNewResponseButtonProps>) {
  const { isPending, startNewResponse } = useStartNewResponse(formId);

  return (
    <button
      className={publicStatusClassNames.action}
      disabled={isPending}
      onClick={startNewResponse}
      type="button"
    >
      Start a new response
    </button>
  );
}

function useStartNewResponse(formId: string) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const startNewResponse = () =>
    startTransition(async () => {
      const result = await startNewResponseAction(formId);
      if (Result.isSuccess(result)) router.refresh();
    });

  return { isPending, startNewResponse };
}
