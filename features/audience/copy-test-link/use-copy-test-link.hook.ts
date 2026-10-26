"use client";

import { useRef, useState } from "react";
import { toast } from "@/components/ui/toast";
import {
  DEFAULT_EXPIRY_MINUTES,
  formatExpiresIn,
} from "@/features/submissions/share-links/share-link-expiry";
import { Result } from "@/lib/result";
import { createTestLinkAction, type TestLink } from "./create-test-link.action";

const REJECTED = "Something went wrong. Try again.";

async function createOrFailure(
  formId: string,
  memberId: string,
  expiryMinutes: number,
) {
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
  const [pending, setPending] = useState(false);
  const creating = useRef(false);

  const copy = async () => {
    if (creating.current) return;
    creating.current = true;
    setPending(true);
    try {
      const created = await createOrFailure(formId, memberId, expiryMinutes);
      if (Result.isError(created)) {
        toast.error(created.message);
        return;
      }
      const absolute = {
        ...created.value,
        url: `${window.location.origin}${created.value.url}`,
      };
      setLink(absolute);
      announce(absolute, await writeToClipboard(absolute.url));
      onCreated?.();
    } finally {
      creating.current = false;
      setPending(false);
    }
  };

  return { expiryMinutes, setExpiryMinutes, link, pending, copy };
}
