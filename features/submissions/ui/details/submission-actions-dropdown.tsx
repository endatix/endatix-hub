import { Button, ButtonProps } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  MoreHorizontal,
  FilePenLine,
  Trash2,
  LinkIcon,
  FolderDown,
} from "lucide-react";
import Link from "next/link";
import { StatusDropdownMenuItem } from "@/features/submissions/use-cases/change-status";
import { toast } from "@/components/ui/toast";

interface SubmissionActionsDropdownProps extends ButtonProps {
  submissionId: string;
  formId: string;
  status: string;
}

export function SubmissionActionsDropdown({
  submissionId,
  formId,
  status,
  ...props
}: SubmissionActionsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          {...props}
          className={cn("flex pl-2 pr-2 items-center", props.className)}
          aria-haspopup="true"
          variant="outline"
        >
          <MoreHorizontal className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="text-gray-600" align="end">
        <DropdownMenuItem className="md:hidden cursor-pointer" asChild>
          <Link href={`/forms/${formId}/submissions/${submissionId}/edit`}>
            <FilePenLine className="w-4 h-4 mr-2" />
            <span>Edit</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem className="cursor-pointer" asChild>
          <Link href={`/share/${formId}`} target="_blank">
            <LinkIcon className="mr-2 h-4 w-4" />
            Share Link
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={async () => {
            const toastId = `download-toast-${submissionId}`;
            toast.info({
              title: "Preparing download...",
              id: toastId,
            });
            try {
              const res = await fetch(
                `/api/forms/${formId}/submissions/${submissionId}/files`,
              );
              if (!res.ok) throw new Error("Download failed");
              const blob = await res.blob();
              const disposition = res.headers.get("content-disposition");
              let filename = "submission-files.zip";
              if (disposition) {
                const match = disposition.match(/filename="?([^"]+)"?/);
                if (match) filename = match[1];
              }
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
              toast.success({
                title: "Download ready!",
                id: toastId,
              });
            } catch (err: unknown) {
              if (err instanceof Error) {
                toast.error({
                  title: err.message,
                  id: toastId,
                });
              } else {
                toast.error({
                  title: "Failed to download files",
                  id: toastId,
                });
              }
            }
          }}
        >
          <FolderDown className="w-4 h-4 mr-2" />
          Download Files
        </DropdownMenuItem>

        <StatusDropdownMenuItem
          className="md:hidden cursor-pointer"
          submissionId={submissionId}
          formId={formId}
          status={status}
        />
        <DropdownMenuItem className="cursor-pointer">
          <Trash2 className="w-4 h-4 mr-2" />
          <span>Delete</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
