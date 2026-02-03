"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

interface FileModalProps {
  formId: string;
  submissionId: string;
  children: React.ReactNode;
}

/**
 * Renders the intercepting-route content inside a Dialog.
 * Close navigates to the files list for the given form and submission.
 */
export function FileModal({
  formId,
  submissionId,
  children,
}: Readonly<FileModalProps>) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const close = useCallback(() => {
    setOpen(false);
    router.push(`/forms/${formId}/submissions/${submissionId}/files`);
  }, [router, formId, submissionId]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next)
        router.push(`/forms/${formId}/submissions/${submissionId}/files`);
    },
    [router, formId, submissionId],
  );

  const handleEscapeKeyDown = useCallback(
    (e: KeyboardEvent) => {
      e.preventDefault();
      close();
    },
    [close],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-4xl overflow-y-auto"
        onEscapeKeyDown={handleEscapeKeyDown}
      >
        <DialogHeader>
          <DialogTitle className="sr-only">File preview</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
