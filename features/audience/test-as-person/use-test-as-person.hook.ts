"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
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
 * Points the open tab at the respondent page once the cookie is set; a failure closes it and
 * toasts. Returns whether the test submission was opened.
 */
async function openInTab(tab: Window, formId: string, membershipId: string) {
  const opened = await openOrFailure(formId, membershipId);
  if (Result.isError(opened)) {
    tab.close();
    toast.error(opened.message);
    return false;
  }
  tab.opener = null;
  tab.location.href = opened.value.url;
  return true;
}

/**
 * Test as this person. The tab opens on the click, while the browser still counts it as the
 * reader's gesture, and is pointed at the respondent page once the cookie is set. A blocked tab
 * stops here: the action would create a test submission and replace this browser's form cookie.
 * A click while one is opening is ignored, so a double-click opens one test submission, not two.
 * Once it is open the page reads again, so a list of their submissions shows the new one.
 */
export function useTestAsPerson(formId: string) {
  const router = useRouter();
  const opening = useRef(false);
  return async (person: AudiencePerson) => {
    if (opening.current) return;
    const tab = window.open("", "_blank");
    if (!tab) {
      toast.error(POPUP_BLOCKED);
      return;
    }
    opening.current = true;
    try {
      if (await openInTab(tab, formId, person.membershipId)) router.refresh();
    } finally {
      opening.current = false;
    }
  };
}
