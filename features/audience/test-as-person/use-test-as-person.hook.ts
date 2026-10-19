"use client";

import { toast } from "@/components/ui/toast";
import type { AudiencePerson } from "@/lib/endatix-api/audience/types";
import { Result } from "@/lib/result";
import { openTestSubmissionAction } from "./open-test-submission.action";

const REJECTED = "Something went wrong. Try again.";
const POPUP_BLOCKED =
  "The browser blocked the new tab. Allow pop-ups for this site and try again.";

async function openOrFailure(formId: string, membershipId: string) {
  try {
    return await openTestSubmissionAction(formId, membershipId);
  } catch {
    return Result.error<{ url: string }>(REJECTED);
  }
}

/**
 * Test as this person. The tab opens on the click, while the browser still counts it as the
 * reader's gesture, and is pointed at the respondent page once the cookie is set; a failure
 * closes it and toasts. A blocked tab toasts too: a second open after the await would be blocked.
 */
export function useTestAsPerson(formId: string) {
  return async (person: AudiencePerson) => {
    const tab = window.open("", "_blank");
    const opened = await openOrFailure(formId, person.membershipId);
    if (Result.isError(opened)) {
      tab?.close();
      toast.error(opened.message);
      return;
    }
    if (!tab) {
      toast.error(POPUP_BLOCKED);
      return;
    }
    tab.opener = null;
    tab.location.href = opened.value.url;
  };
}
