"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

interface FileModalProps {
  children: React.ReactNode;
}

/**
 * Renders the intercepting-route content inside a Dialog.
 */
export function FileModal({ children }: Readonly<FileModalProps>) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(true);

  const listPath = useMemo(() => {
    if (!pathname) {
      return null;
    }

    const segments = pathname.split("/").filter(Boolean);
    const filesIndex = segments.indexOf("files");
    return filesIndex === -1
      ? null
      : "/" + segments.slice(0, filesIndex + 1).join("/");
  }, [pathname]);

  const close = useCallback(() => {
    setOpen(false);
    if (listPath) router.push(listPath as Parameters<typeof router.push>[0]);
  }, [router, listPath]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next && listPath)
        router.push(listPath as Parameters<typeof router.push>[0]);
    },
    [router, listPath],
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
