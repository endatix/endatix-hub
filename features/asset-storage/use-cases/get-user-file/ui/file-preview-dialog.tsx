"use client";

import {
  ResponsivePanel,
  ResponsivePanelBody,
  ResponsivePanelDescription,
  ResponsivePanelHeader,
  ResponsivePanelTitle,
} from "@/components/ui/responsive-panel";

interface FilePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The file name; falls back to "File preview". */
  title?: string;
  /** The MIME type, when known. */
  description?: string;
  children: React.ReactNode;
}

/**
 * Shared shell for a submission file preview: the files-list route modal and the
 * details-page dialog render the same frame, so they read as one surface.
 * Dialog on desktop, bottom Drawer under `md` (DESIGN.md §5 Overlay rulebook).
 */
export function FilePreviewDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: Readonly<FilePreviewDialogProps>) {
  return (
    <ResponsivePanel
      desktopType="simple"
      open={open}
      onOpenChange={onOpenChange}
      dialogContentClassName="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
    >
      <ResponsivePanelHeader className="min-w-0 px-6 pt-6 pr-12">
        <ResponsivePanelTitle className="truncate">
          {title ?? "File preview"}
        </ResponsivePanelTitle>
        <ResponsivePanelDescription
          className={description ? "truncate" : "sr-only"}
        >
          {description ?? "A file uploaded with this submission."}
        </ResponsivePanelDescription>
      </ResponsivePanelHeader>
      <ResponsivePanelBody>{children}</ResponsivePanelBody>
    </ResponsivePanel>
  );
}
