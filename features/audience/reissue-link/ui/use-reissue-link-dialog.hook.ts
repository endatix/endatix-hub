"use client";

import { useState } from "react";
import type { LinkHolder } from "./reissue-link-dialog";

/**
 * Which participant the Reissue link dialog is for; they keep showing while it closes. `session`
 * changes on every open, so the dialog keyed by it starts at the warning again.
 */
export function useReissueLinkDialog() {
  const [person, setPerson] = useState<LinkHolder | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState(0);
  const open = (next: LinkHolder) => {
    setPerson(next);
    setIsOpen(true);
    setSession((count) => count + 1);
  };
  const onClose = () => setIsOpen(false);
  return { open, session, dialog: { person, open: isOpen, onClose } };
}
