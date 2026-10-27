"use client";

import { useState } from "react";
import { toast } from "@/components/ui/toast";
import {
  DEFAULT_EXPIRY_MINUTES,
  formatExpiresIn,
} from "@/lib/share-links/share-link-expiry";
import { Result } from "@/lib/result";
import { useOneAtATime } from "../use-one-at-a-time.hook";
import { createTestLinkAction, type TestLink } from "./create-test-link.action";

const REJECTED = "Something went wrong. Try again.";

type TestLinkRequest = {
  formId: string;
  memberId: string;
  expiryMinutes: number;
};

async function createOrFailure(request: TestLinkRequest) {
  const { formId, memberId, expiryMinutes } = request;
  try {
    return await createTestLinkAction(formId, memberId, expiryMinutes);
  } catch {
    return Result.error<TestLink>(REJECTED);
  }
}

async function writeToClipboard(value: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

/** The clipboard can refuse after the action's round trip (Safari); the dialog still shows the link. */
function announce(link: TestLink, copied: boolean) {
  toast.success({
    title: copied ? "Test link copied" : "Test link created",
    description: `It opens one test submission without a login. ${formatExpiresIn(link.expiresAt)}.`,
  });
}

/** Creates the link and copies its absolute URL; a failure toasts and returns null. */
async function createAndCopy(request: TestLinkRequest) {
  const created = await createOrFailure(request);
  if (Result.isError(created)) {
    toast.error(created.message);
    return null;
  }
  const url = `${window.location.origin}${created.value.url}`;
  const link = { ...created.value, url };
  announce(link, await writeToClipboard(url));
  return link;
}

/**
 * Copy test link for one test person: each copy opens a new test submission and copies an
 * absolute link to it. A click while one is being created is ignored, so a double-click makes
 * one test submission. `onCreated` runs once it exists, for a page that lists their submissions.
 */
export function useCopyTestLink(
  formId: string,
  memberId: string,
  onCreated?: () => void,
) {
  const [expiryMinutes, setExpiryMinutes] = useState(DEFAULT_EXPIRY_MINUTES);
  const [link, setLink] = useState<TestLink | null>(null);
  const { pending, run } = useOneAtATime();
  const copy = () =>
    run(async () => {
      const created = await createAndCopy({ formId, memberId, expiryMinutes });
      if (!created) return;
      setLink(created);
      onCreated?.();
    });
  return { expiryMinutes, setExpiryMinutes, link, pending, copy };
}
