"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/toast";
import { Result } from "@/lib/result";
import { personalLinkUrl } from "../generate-links/personal-links";
import { useOneAtATime } from "../use-one-at-a-time.hook";
import { reissueAudienceLinkAction } from "./reissue-audience-link.action";

const REJECTED = "Something went wrong. Try again.";

async function reissueOrFailure(formId: string, membershipId: string) {
  try {
    return await reissueAudienceLinkAction(formId, membershipId);
  } catch {
    return Result.error<never>(REJECTED);
  }
}

type ReissueTarget = { formId: string; membershipId: string };

/**
 * Reissue one participant's link and hold the new absolute URL, shown once. A click while one
 * runs is ignored: a second reissue would revoke the link the first just made. Closing after a
 * reissue reads the page again, so the Link column is current.
 */
export function useReissueLink({ formId, membershipId }: ReissueTarget) {
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { pending, run } = useOneAtATime();
  const reissue = () =>
    run(async () => {
      setError(null);
      const reissued = await reissueOrFailure(formId, membershipId);
      if (Result.isError(reissued)) return setError(reissued.message);
      setUrl(
        personalLinkUrl(window.location.origin, formId, reissued.value.token),
      );
      toast.success("New link created");
    });
  const close = (onClose: () => void) => {
    if (pending) return;
    if (url) router.refresh();
    onClose();
  };
  return { url, error, pending, reissue, close };
}
