"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { FilePreviewDialog } from "./file-preview-dialog";

interface FileModalProps {
  formId: string;
  submissionId: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * Renders the intercepting-route content inside a Dialog.
 * Close navigates to the files list for the given form and submission.
 */
export function FileModal({
  formId,
  submissionId,
  title,
  description,
  children,
}: Readonly<FileModalProps>) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next)
        router.push(`/forms/${formId}/submissions/${submissionId}/files`);
    },
    [router, formId, submissionId],
  );

  return (
    <FilePreviewDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={title}
      description={description}
    >
      {children}
    </FilePreviewDialog>
  );
}
