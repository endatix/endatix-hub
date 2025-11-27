"use client";

import { Button } from "@/components/ui/button";
import {
  Copy,
  Share2,
  List,
  MoreHorizontal,
  Trash2,
  FilePen,
  Save,
} from "lucide-react";
import { Form } from "@/types";
import Link from "next/link";
import { SectionTitle } from "@/components/headings/section-title";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTransition, useState } from "react";
import { updateFormStatusAction } from "../application/actions/update-form-status.action";
import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { deleteFormAction } from "../application/actions/delete-form.action";
import { Result } from "@/lib/result";
import { useRouter } from "next/navigation";
import { SaveAsTemplateDialog } from "./save-as-template-dialog";
import { AlertTriangle } from "lucide-react";
import PageTitle from "@/components/headings/page-title";
import CopyToClipboard from "@/components/copy-to-clipboard";
import { WebhookSettings } from "./webhook-settings";
import { ShareDialog } from "./share-dialog";

interface DeleteFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  formName: string;
  submissionsCount: number;
  onDelete: () => Promise<void>;
}

const DeleteFormDialog = ({
  isOpen,
  onOpenChange,
  formName,
  submissionsCount,
  onDelete,
}: DeleteFormDialogProps) => {
  const [formNameInput, setFormNameInput] = useState("");

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setFormNameInput("");
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (formNameInput !== formName) {
      toast.error("Form name doesn't match");
      return;
    }
    onDelete();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to delete form <strong>{formName}</strong>?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4 mb-1">
            <span className="flex items-center gap-2 text-destructive font-medium">
              <AlertTriangle className="h-4 w-4" />
              This action will permanently delete the form, all its definitions
              and submissions, and cannot be undone.
            </span>
            <span className="block text-sm">
              <strong>{formName}</strong> has{" "}
              <strong>{submissionsCount}</strong> submissions.
            </span>
            <span className="block text-sm">
              To confirm, type the name of the form below:
            </span>
          </AlertDialogDescription>
          <Input
            type="text"
            placeholder={`Type "${formName}"`}
            value={formNameInput}
            onChange={(e) => setFormNameInput(e.target.value)}
            className="w-full mt-1"
          />
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteClick}
            className="bg-destructive hover:bg-destructive/90"
          >
            Delete Form
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

interface FormDetailsProps {
  form: Form;
  enableEditing?: boolean;
  showHeader?: boolean;
  onFormDeleted?: () => void; // Callback for when form is successfully deleted
  titleSize?: "text-xl" | "text-2xl" | "text-3xl" | "text-4xl";
}

const FormDetails = ({
  form,
  enableEditing = false,
  showHeader = true,
  onFormDeleted,
  titleSize = "text-4xl",
}: FormDetailsProps) => {
  const [pending, startTransition] = useTransition();
  const [isEnabled, setIsEnabled] = useState(form?.isEnabled);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaveAsTemplateOpen, setIsSaveAsTemplateOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const router = useRouter();

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

  const getSubmissionsLabel = () => {
    const count = form?.submissionsCount ?? 0;
    if (count === 0) {
      return "No submissions yet";
    }

    return `${count}`;
  };

  const enabledLabel = form?.isEnabled ? "Enabled" : "Disabled";

  const toggleEnabled = async (enabled: boolean) => {
    setIsEnabled(enabled);
    startTransition(async () => {
      const updateStatusResult = await updateFormStatusAction(form.id, enabled);
      if (updateStatusResult === undefined) {
        toast.error("Could not proceed with updating form status");
        return;
      }

      if (Result.isError(updateStatusResult)) {
        setIsEnabled(!enabled);
        toast.error(
          "Failed to update form status. Error: " + updateStatusResult.message,
        );
        return;
      }

      toast.success(`Form is now ${enabled ? "enabled" : "disabled"}`);
    });
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
  };

  const handleDelete = async () => {
    startTransition(async () => {
      const result = await deleteFormAction(form.id);
      if (result === undefined || Result.isError(result)) {
        toast.error({
          title: "Failed to delete form",
          description: result?.message || "",
        });
        return;
      }

      if (Result.isSuccess(result)) {
        toast.success({
          title: (
            <>
              <strong>{form.name}</strong> deleted successfully
            </>
          ),
        });
        setIsDialogOpen(false);
        onFormDeleted?.();
        setTimeout(() => {
          router.push("/forms");
          router.refresh();
        }, 1000);
      }
    });
  };

  const handleOpenDeleteDialog = () => {
    setIsDropdownOpen(false);
    setIsDialogOpen(true);
  };

  const handleOpenSaveAsTemplate = () => {
    setIsDropdownOpen(false);
    setIsSaveAsTemplateOpen(true);
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        {/* Header - conditionally rendered for flexibility */}
        {showHeader && (
          <div>
            <PageTitle title={form?.name} className={titleSize} />
            {form?.description && (
              <p className="text-muted-foreground">{form.description}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2 justify-end ml-auto">
          <Button variant={"outline"} asChild>
            <Link href={{ pathname: `/forms/${form.id}/design` }}>
              <FilePen className="mr-2 h-4 w-4" />
              Design
            </Link>
          </Button>
          <Button variant={"outline"} onClick={() => setIsShareDialogOpen(true)}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant={"outline"} asChild>
            <Link
              href={{
                pathname: `/forms/${form.id}/submissions`,
              }}
            >
              <List className="w-4 h-4 mr-1" />
              Submissions
            </Link>
          </Button>
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={handleOpenSaveAsTemplate}
              >
                <Save className="mr-2 h-4 w-4" />
                Save as Template
              </DropdownMenuItem>
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
      </div>

      {/* Form Details */}
      <div className="max-w-2xl mx-auto">
        <SectionTitle title="Form details" headingClassName="text-xl mt-4" />
      </div>
      <div className="grid gap-2 py-4 max-w-2xl mx-auto">
        <div className="grid grid-cols-4 py-2 items-center gap-4">
          <span className="text-right self-start">Created at</span>
          <span className="text-sm text-muted-foreground col-span-3">
            {getFormattedDate(form.createdAt)}
          </span>
        </div>
        <div className="grid grid-cols-4 py-2 items-center gap-4">
          <span className="text-right self-start">Modified on</span>
          <span className="text-sm text-muted-foreground col-span-3">
            {getFormattedDate(form.modifiedAt)}
          </span>
        </div>

        <div className="grid grid-cols-4 py-2 items-center gap-4">
          <span className="text-right self-start">Status</span>
          <div className="col-span-3 flex items-center space-x-2">
            {enableEditing ? (
              <>
                <Switch
                  id="form-status"
                  checked={isEnabled}
                  onCheckedChange={toggleEnabled}
                  disabled={pending}
                  aria-readonly
                />
                <Label htmlFor="form-status">{enabledLabel}</Label>
              </>
            ) : (
              <Badge variant={form.isEnabled ? "default" : "secondary"}>
                {enabledLabel}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 py-2 items-center gap-4">
          <span className="col-span-1 text-right self-start">Submissions</span>
          <div className="text-sm text-muted-foreground col-span-3">
            {getSubmissionsLabel()}
          </div>
        </div>
      </div>

      {/* Webhook Configuration Section */}
      <WebhookSettings
        formId={form.id}
        initialSettings={form.webHookSettingsJson}
      />

      <ShareDialog
        formId={form.id}
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
      />

      <SaveAsTemplateDialog
        formId={form.id}
        formName={form.name}
        open={isSaveAsTemplateOpen}
        onOpenChange={setIsSaveAsTemplateOpen}
      />

      <DeleteFormDialog
        isOpen={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        formName={form.name}
        submissionsCount={form.submissionsCount || 0}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default FormDetails;
