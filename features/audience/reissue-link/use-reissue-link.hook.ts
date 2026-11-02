"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Result } from "@/lib/result";
import { personalLinkUrl } from "../generate-links/personal-links";
import { useOneAtATime } from "../use-one-at-a-time.hook";
import { reissueAudienceLinkAction } from "./reissue-audience-link.action";

const REJECTED = "Something went wrong. Try again.";

type ReissueTarget = { formId: string; membershipId: string };

/** The new link's absolute URL, or the reason there is none. */
async function reissueToUrl({ formId, membershipId }: ReissueTarget) {
  try {
    const reissued = await reissueAudienceLinkAction(formId, membershipId);
    if (Result.isError(reissued)) return reissued;
    const { origin } = window.location;
    return Result.success(
      personalLinkUrl(origin, formId, reissued.value.token),
    );
  } catch {
    return Result.error<string>(REJECTED);
  }
}

/**
 * Reissue one participant's link and hold the new absolute URL, shown once. A click while one
 * runs is ignored: a second reissue would revoke the link the first just made. Closing after a
 * reissue reads the page again, so the Link column is current.
 */
export function useReissueLink(target: ReissueTarget, onClose: () => void) {
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { pending, run } = useOneAtATime();
  const reissue = () =>
    run(async () => {
      setError(null);
      const reissued = await reissueToUrl(target);
      if (Result.isError(reissued)) setError(reissued.message);
      else setUrl(reissued.value);
    });
  const close = () => {
    if (pending) return;
    if (url) router.refresh();
    onClose();
  };
  return { url, error, pending, reissue, close };
}
