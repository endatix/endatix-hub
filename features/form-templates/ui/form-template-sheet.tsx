"use client";

import { Spinner } from "@/components/loaders/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { Result } from "@/lib/result";
import { getFormattedDate } from "@/lib/utils";
import { FormTemplate } from "@/types";
import {
  AlertTriangle,
  Eye,
  FilePen,
  FilePlus2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { deleteTemplateAction } from "../application/delete-template.action";
import { runCreateFormFromTemplate } from "../application/run-create-form-from-template.client";

interface FormTemplateSheetProps extends Omit<
  React.ComponentProps<typeof Sheet>,
  "open" | "onOpenChange" | "modal"
> {
  selectedTemplate: FormTemplate | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  enableEditing?: boolean;
  onPreviewClick?: (templateId: string) => void;
  requireFolderAssignment?: boolean;
}

const FormTemplateSheet = ({
  selectedTemplate,
  onPreviewClick,
  requireFolderAssignment = false,
  ...props
}: FormTemplateSheetProps) => {
  const [pendingCreateForm, startCreateFormTransition] = useTransition();
  const [pending, startTransition] = useTransition();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formTemplateNameInput, setFormTemplateNameInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  if (!selectedTemplate) {
    return null;
  }

  const handleUseTemplate = () => {
    if (requireFolderAssignment) {
      toast.info({
        title: "Folder selection is required",
        description: "Use Create a Form flow to select a folder first.",
      });
      return;
    }

    startCreateFormTransition(async () => {
      await runCreateFormFromTemplate(selectedTemplate.id, router);
    });
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onPreviewClick) {
      onPreviewClick(selectedTemplate.id);
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setFormTemplateNameInput("");
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (formTemplateNameInput !== selectedTemplate.name) {
      toast.error("Form template name doesn't match");
      return;
    }
    handleDelete();
  };

  const handleDelete = async () => {
    startTransition(async () => {
      const result = await deleteTemplateAction(selectedTemplate.id);
      if (result === undefined) {
        toast.error("Could not proceed with deleting template");
        return;
      }

      if (Result.isError(result)) {
        toast.error(result.message || "Failed to delete form template");
        return;
      }

      toast.success({
        title: "Form template deleted successfully",
        description: (
          <>
            <strong>{selectedTemplate.name}</strong> was deleted successfully
          </>
        ),
      });
      setIsDialogOpen(false);
    });
  };

  const handleOpenDeleteDialog = () => {
    setIsDropdownOpen(false);
    setIsDialogOpen(true);
  };

  return (
    selectedTemplate && (
      <Sheet {...props} modal>
        <SheetContent className="w-[600px] sm:w-[480px] sm:max-w-none">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold">
              {selectedTemplate?.name}
            </SheetTitle>
            <SheetDescription>{selectedTemplate?.description}</SheetDescription>
          </SheetHeader>
          <div className="my-8 flex justify-end space-x-2">
            <Button variant={"outline"} asChild>
              <Link href={`/forms/templates/${selectedTemplate.id}`}>
                <FilePen className="mr-2 h-4 w-4" />
                Design
              </Link>
            </Button>
            <Button variant={"outline"} onClick={handlePreviewClick}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </Button>
            <Button
              disabled={pendingCreateForm || requireFolderAssignment}
              variant={"outline"}
              onClick={handleUseTemplate}
              title={
                requireFolderAssignment
                  ? "Folder selection is required. Use Create a Form."
                  : undefined
              }
            >
              {pendingCreateForm ? (
                <Spinner className="mr-1 h-4 w-4" />
              ) : (
                <FilePlus2 className="mr-1 h-4 w-4" />
              )}
              {pendingCreateForm ? "Creating..." : "Use Template"}
            </Button>
            <DropdownMenu
              open={isDropdownOpen}
              onOpenChange={setIsDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="cursor-pointer text-destructive"
                  onClick={handleOpenDeleteDialog}
                  disabled={pending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {pending ? <Spinner className="h-4 w-4" /> : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <AlertDialog
            open={isDialogOpen}
            onOpenChange={handleDialogOpenChange}
          >
            <AlertDialogContent
              onOpenAutoFocus={(e: Event) => {
                e.preventDefault();
                inputRef.current?.focus();
              }}
            >
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Are you sure you want to delete form template{" "}
                  <strong>{selectedTemplate.name}</strong>?
                </AlertDialogTitle>
                <AlertDialogDescription className="mb-1 space-y-4">
                  <span className="flex items-center gap-2 font-medium text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    This action will permanently delete the form template.
                  </span>
                  <span className="block text-sm">
                    To confirm, type the name of the form template below:
                  </span>
                </AlertDialogDescription>
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder={`Type "${selectedTemplate.name}"`}
                  value={formTemplateNameInput}
                  onChange={(e) => setFormTemplateNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (formTemplateNameInput === selectedTemplate.name) {
                        handleDelete();
                      } else {
                        toast.error("Form template name doesn't match");
                      }
                    }
                  }}
                  className="mt-1 w-full"
                />
              </AlertDialogHeader>

              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={formTemplateNameInput !== selectedTemplate.name}
                  onClick={handleDeleteClick}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Delete Template
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="grid gap-2 py-4">
            <div className="grid grid-cols-4 items-center gap-4 py-2">
              <span className="self-start text-right">Created at</span>
              <span className="col-span-3 text-sm text-muted-foreground">
                {getFormattedDate(selectedTemplate.createdAt)}
              </span>
            </div>
          </div>
          <SheetFooter></SheetFooter>
        </SheetContent>
      </Sheet>
    )
  );
};
export default FormTemplateSheet;
