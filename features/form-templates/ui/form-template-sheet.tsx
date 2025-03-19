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
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { Result } from "@/lib/result";
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
import { useEffect, useState, useTransition, useRef } from "react";
import { updateTemplateStatusAction } from "../application/update-template-status.action";
import { useTemplateAction } from "../application/use-template.action";
import { deleteTemplateAction } from "../application/delete-template.action";

interface FormTemplateSheetProps
  extends React.ComponentPropsWithoutRef<typeof Sheet> {
  selectedTemplate: FormTemplate | null;
  enableEditing?: boolean;
  onPreviewClick?: (templateId: string) => void;
}

const FormTemplateSheet = ({
  selectedTemplate,
  onPreviewClick,
  ...props
}: FormTemplateSheetProps) => {
  const [pendingCreateForm, startCreateFormTransition] = useTransition();
  const [pending, startTransition] = useTransition();
  const [isEnabled, setIsEnabled] = useState(
    selectedTemplate?.isEnabled ?? false,
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formTemplateNameInput, setFormTemplateNameInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (selectedTemplate) {
      setIsEnabled(selectedTemplate.isEnabled);
    }
  }, [selectedTemplate]);

  if (!selectedTemplate) {
    return null;
  }

  const handleUseTemplate = () => {
    if (!selectedTemplate.isEnabled) return;

    startCreateFormTransition(async () => {
      // this is not a hook, but an action, so adding this rule to avoid the false eslint error
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const result = await useTemplateAction({
        templateId: selectedTemplate.id,
      });

      if (Result.isSuccess(result)) {
        toast.success("Form created from template successfully");
        router.push(`/forms/${result.value}`);
      } else {
        toast.error(result.message || "Failed to create form from template");
      }
    });
  };

  const handlePreviewClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onPreviewClick) {
      onPreviewClick(selectedTemplate.id);
    }
  };

  const getFormattedDate = (date?: Date) => {
    if (!date) {
      return;
    }

    return new Date(date).toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour12: true,
    });
  };

  const enabledLabel = selectedTemplate?.isEnabled ? "Enabled" : "Disabled";

  const toggleEnabled = async (enabled: boolean) => {
    setIsEnabled(enabled);
    startTransition(async () => {
      try {
        await updateTemplateStatusAction(selectedTemplate.id, enabled);
        toast.success(
          `Form template is now ${enabled ? "enabled" : "disabled"}`,
        );
      } catch (error) {
        setIsEnabled(!enabled);
        toast.error("Failed to update form template status. Error: " + error);
      }
    });
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
      try {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const result = await deleteTemplateAction(selectedTemplate.id);
        if (Result.isSuccess(result)) {
          toast.success({
            title: "Form template deleted successfully",
            description: (
              <>
                <strong>{selectedTemplate.name}</strong> was deleted
                successfully
              </>
            ),
          });
          setIsDialogOpen(false);
          props.onOpenChange?.(false);
        } else {
          toast.error("Failed to delete form template");
        }
      } catch {
        toast.error("Failed to delete form template");
      }
    });
  };

  const handleOpenDeleteDialog = () => {
    setIsDropdownOpen(false);
    setIsDialogOpen(true);
  };

  return (
    selectedTemplate && (
      <Sheet {...props}>
        <SheetContent className="w-[600px] sm:w-[480px] sm:max-w-none">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold">
              {selectedTemplate?.name}
            </SheetTitle>
            <SheetDescription>{selectedTemplate?.description}</SheetDescription>
          </SheetHeader>
          <div className="my-8 flex space-x-2 justify-end">
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
              disabled={!selectedTemplate.isEnabled || pendingCreateForm}
              variant={"outline"}
              onClick={handleUseTemplate}
            >
              {pendingCreateForm ? (
                <Spinner className="w-4 h-4 mr-1" />
              ) : (
                <FilePlus2 className="w-4 h-4 mr-1" />
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
                  className="text-destructive cursor-pointer"
                  onClick={handleOpenDeleteDialog}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <AlertDialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <AlertDialogContent
              onOpenAutoFocus={(e) => {
                e.preventDefault();
                inputRef.current?.focus();
              }}
            >
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Are you sure you want to delete form template{" "}
                  <strong>{selectedTemplate.name}</strong>?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-4 mb-1">
                  <span className="flex items-center gap-2 text-destructive font-medium">
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
                  className="w-full mt-1"
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
            <div className="grid grid-cols-4 py-2 items-center gap-4">
              <span className="text-right self-start">Created at</span>
              <span className="text-sm text-muted-foreground col-span-3">
                {getFormattedDate(selectedTemplate.createdAt)}
              </span>
            </div>

            <div className="grid grid-cols-4 py-2 items-center gap-4">
              <span className="text-right self-start">Status</span>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch
                  id="form-template-status"
                  checked={isEnabled}
                  onCheckedChange={toggleEnabled}
                  disabled={pending}
                  aria-readonly
                />
                <Label htmlFor="form-template-status">{enabledLabel}</Label>
              </div>
            </div>
          </div>
          <SheetFooter></SheetFooter>
        </SheetContent>
      </Sheet>
    )
  );
};
export default FormTemplateSheet;
