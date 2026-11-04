"use client";

import { useState } from "react";
import type { TestPerson } from "./copy-test-link-dialog";

/** Which test person the Copy test link dialog is for; the person keeps showing while it closes. */
export function useCopyTestLinkDialog() {
  const [person, setPerson] = useState<TestPerson | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const open = (next: TestPerson) => {
    setPerson(next);
    setIsOpen(true);
  };
  return { open, dialog: { person, open: isOpen, onOpenChange: setIsOpen } };
}
