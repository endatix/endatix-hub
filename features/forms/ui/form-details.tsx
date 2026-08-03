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
  BarChart3,
  Globe,
  Lock,
} from "lucide-react";
import { Form } from "@/types";
import Link from "next/link";
import { SectionTitle } from "@/components/headings/section-title";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTransition, useState, useEffect, useMemo } from "react";
import { updateFormStatusAction } from "../application/actions/update-form-status.action";
import { updateFormVisibilityAction } from "../application/actions/update-form-visibility.action";
import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { getFormattedDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { SaveAsTemplateDialog } from "./save-as-template-dialog";
import { AlertTriangle } from "lucide-react";
import PageTitle from "@/components/headings/page-title";
import { WebhookSettings } from "./webhook-settings";
import { ShareDialog } from "./share-dialog";
import { updateFormSettingsAction } from "../application/actions/update-form-settings.action";
import { getTenantSettingsAction } from "../application/actions/get-tenant-settings.action";
import {
  formatOrganizationDefaultLabel,
  formatSessionExpiryHours,
  parseSessionExpiryHoursInput,
  SessionExpiryHoursControl,
  sessionExpiryHoursToInput,
  type SessionExpiryHours,
} from "@/features/forms/manage-session-expiry";
import { listFoldersAction } from "@/features/folders/server";
import type { Folder } from "@/lib/endatix-api/folders/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FormFolderLink, type FormFolderLinkProps } from "./form-folder-link";

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
          <AlertDialogDescription className="mb-1 space-y-4">
            <span className="flex items-center gap-2 font-medium text-destructive">
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
            className="mt-1 w-full"
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
  mode?: "sheet" | "page";
  enableEditing?: boolean;
  showHeader?: boolean;
  enableAnalytics?: boolean;
  folderLink?: FormFolderLinkProps;
  onFormDeleted?: () => void; // Callback for when form is successfully deleted
  titleSize?: "text-xl" | "text-2xl" | "text-3xl" | "text-4xl";
}

const FormDetails = ({
  form,
  mode = "page",
  enableEditing = false,
  showHeader = true,
  enableAnalytics = false,
  folderLink,
  onFormDeleted,
  titleSize = "text-4xl",
}: FormDetailsProps) => {
  const [pending, startTransition] = useTransition();
  const [isEnabled, setIsEnabled] = useState(form?.isEnabled);
  const [isPublic, setIsPublic] = useState(form?.isPublic);
  const [limitOnePerUser, setLimitOnePerUser] = useState(
    form?.limitOnePerUser ?? false,
  );
  const [tokenExpiryHoursInput, setTokenExpiryHoursInput] = useState(
    sessionExpiryHoursToInput(form?.submissionTokenExpiryHours),
  );
  const [organizationDefaultHours, setOrganizationDefaultHours] =
    useState<SessionExpiryHours>(null);
  const [metadata, setMetadata] = useState(form?.metadata ?? "");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    () => form.folderId ?? "__none__",
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaveAsTemplateOpen, setIsSaveAsTemplateOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isEnableLimitWarningOpen, setIsEnableLimitWarningOpen] =
    useState(false);
  const [isEnableLimitErrorOpen, setIsEnableLimitErrorOpen] = useState(false);
  const [enableLimitErrorMessage, setEnableLimitErrorMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    setSelectedFolderId(form.folderId ?? "__none__");
  }, [form.id, form.folderId]);

  useEffect(() => {
    setTokenExpiryHoursInput(
      sessionExpiryHoursToInput(form.submissionTokenExpiryHours),
    );
  }, [form.id, form.submissionTokenExpiryHours]);

  useEffect(() => {
    let cancelled = false;
    void getTenantSettingsAction().then((result) => {
      if (cancelled || !Result.isSuccess(result)) {
        return;
      }
      setOrganizationDefaultHours(
        result.value.submissionTokenExpiryHours ?? null,
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!enableEditing) {
      return;
    }
    let cancelled = false;
    void listFoldersAction().then((result) => {
      if (cancelled || !Result.isSuccess(result)) {
        return;
      }
      setFolders(result.value);
    });
    return () => {
      cancelled = true;
    };
  }, [enableEditing]);

  const folderSelectItems = useMemo(() => {
    if (form.folderId && !folders.some((f) => f.id === form.folderId)) {
      return [
        ...folders,
        {
          id: form.folderId,
          name: "Current folder",
          slug: "",
          isActive: false,
          immutable: false,
        } satisfies Folder,
      ];
    }
    return folders;
  }, [folders, form.folderId]);

  const displayedFolderLink = useMemo((): FormFolderLinkProps | undefined => {
    if (mode === "sheet") {
      return undefined;
    }

    if (!folderLink && !enableEditing) {
      return undefined;
    }

    if (selectedFolderId === "__none__") {
      return { label: "Unassigned", unassigned: true };
    }

    const folder = folderSelectItems.find(
      (candidate) => candidate.id === selectedFolderId,
    );
    if (folder) {
      return {
        label: folder.name,
        immutable: folder.immutable,
        isActive: folder.isActive,
        folderSlug: folder.slug || undefined,
      };
    }

    return folderLink;
  }, [mode, enableEditing, folderLink, folderSelectItems, selectedFolderId]);

  const enabledLabel = form?.isEnabled ? "Enabled" : "Disabled";
  const visibilityLabel = isPublic ? "Public" : "Private";
  const limitOnePerUserDisabled = limitOnePerUser || isPublic || pending;
  const visibilityDisabled = pending || limitOnePerUser;
  const visibilityDisabledReason = limitOnePerUser
    ? 'Visibility cannot be changed while "one response per person" is enabled.'
    : pending
      ? "Please wait for the current update to finish."
      : undefined;
  const limitOnePerUserDisabledReason = limitOnePerUser
    ? "This setting is permanent once enabled."
    : isPublic
      ? "This option is available only for private forms."
      : pending
        ? "Please wait for the current update to finish."
        : undefined;

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

  const toggleVisibility = async (publicValue: boolean) => {
    setIsPublic(publicValue);

    startTransition(async () => {
      const result = await updateFormVisibilityAction(form.id, publicValue);
      if (result === undefined) {
        toast.error("Could not proceed with updating form visibility");
        return;
      }

      if (Result.isError(result)) {
        setIsPublic(!publicValue);
        toast.error(
          "Failed to update form visibility. Error: " + result.message,
        );
        return;
      }

      toast.success(`Form is now ${publicValue ? "public" : "private"}`);
    });
  };

  const committedTokenExpiryInput = sessionExpiryHoursToInput(
    form.submissionTokenExpiryHours,
  );
  const isTokenExpiryDirty =
    tokenExpiryHoursInput.trim() !== committedTokenExpiryInput;
  const isTokenExpiryOverridden = form.submissionTokenExpiryHours != null;

  const updateSubmissionTokenExpiry = () => {
    const previous = committedTokenExpiryInput;
    const parsed = parseSessionExpiryHoursInput(tokenExpiryHoursInput);
    if (!parsed.ok) {
      toast.error(parsed.message);
      setTokenExpiryHoursInput(previous);
      return;
    }

    startTransition(async () => {
      const result =
        parsed.hours == null
          ? await updateFormSettingsAction(form.id, {
              clearSubmissionTokenExpiryHours: true,
            })
          : await updateFormSettingsAction(form.id, {
              submissionTokenExpiryHours: parsed.hours,
            });

      if (result === undefined || Result.isError(result)) {
        setTokenExpiryHoursInput(previous);
        toast.error(
          "Failed to update session expiry. Error: " +
            (result && Result.isError(result) ? result.message : ""),
        );
        return;
      }

      toast.success(
        parsed.hours == null
          ? `Session expiry restored to ${formatOrganizationDefaultLabel(organizationDefaultHours).toLowerCase()}`
          : `Session expiry set to ${formatSessionExpiryHours(parsed.hours)}`,
      );
    });
  };

  const restoreSubmissionTokenExpiryDefault = () => {
    const previous = committedTokenExpiryInput;
    setTokenExpiryHoursInput("");

    startTransition(async () => {
      const result = await updateFormSettingsAction(form.id, {
        clearSubmissionTokenExpiryHours: true,
      });

      if (result === undefined || Result.isError(result)) {
        setTokenExpiryHoursInput(previous);
        toast.error(
          "Failed to restore session expiry. Error: " +
            (result && Result.isError(result) ? result.message : ""),
        );
        return;
      }

      toast.success(
        `Session expiry restored to ${formatOrganizationDefaultLabel(organizationDefaultHours).toLowerCase()}`,
      );
    });
  };

  const updateLimitOnePerUser = async (checked: boolean) => {
    setLimitOnePerUser(checked);
    startTransition(async () => {
      const result = await updateFormSettingsAction(form.id, {
        limitOnePerUser: checked,
      });

      if (result === undefined || Result.isError(result)) {
        setLimitOnePerUser(!checked);
        if (checked) {
          setEnableLimitErrorMessage(
            result && Result.isError(result)
              ? result.message
              : "Could not proceed with updating single-response setting.",
          );
          setIsEnableLimitErrorOpen(true);
          return;
        }

        toast.error(
          "Failed to update single-response setting. Error: " +
            (result && Result.isError(result) ? result.message : ""),
        );
        return;
      }

      toast.success(
        checked
          ? "Single response per user is enabled"
          : "Single response per user is disabled",
      );
    });
  };

  const handleLimitOnePerUserChange = async (checked: boolean) => {
    if (checked && !limitOnePerUser) {
      setIsEnableLimitWarningOpen(true);
      return;
    }

    await updateLimitOnePerUser(checked);
  };

  const handleConfirmEnableLimitOnePerUser = async () => {
    setIsEnableLimitWarningOpen(false);
    await updateLimitOnePerUser(true);
  };

  const applyFolderChange = async (value: string) => {
    const previous = selectedFolderId;
    setSelectedFolderId(value);
    startTransition(async () => {
      const payload =
        value === "__none__" ? { clearFolderId: true } : { folderId: value };
      const result = await updateFormSettingsAction(form.id, payload);

      if (result === undefined || Result.isError(result)) {
        setSelectedFolderId(previous);
        const message =
          result && Result.isError(result)
            ? result.message
            : "Failed to update folder";
        const [title, ...rest] = message.split(". ");
        const details = rest.join(". ").trim();
        toast.error({
          title: title || "Failed to update folder",
          description: details || undefined,
        });
        return;
      }

      toast.success(value === "__none__" ? "Folder cleared" : "Folder updated");
      router.refresh();
    });
  };

  const handleSaveMetadata = async () => {
    startTransition(async () => {
      const result = await updateFormSettingsAction(form.id, {
        metadata: metadata.trim() === "" ? null : metadata,
      });

      if (result === undefined || Result.isError(result)) {
        toast.error(
          "Failed to update metadata. Error: " +
            (result && Result.isError(result) ? result.message : ""),
        );
        return;
      }

      toast.success("Form metadata updated");
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
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        {/* Header - conditionally rendered for flexibility */}
        {showHeader && (
          <div>
            {displayedFolderLink ? (
              <FormFolderLink {...displayedFolderLink} className="mb-2" />
            ) : null}
            <PageTitle title={form?.name} className={titleSize} />
            {form?.description && (
              <p className="text-muted-foreground">{form.description}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="ml-auto flex justify-end space-x-2">
          <Button variant={"outline"} asChild>
            <Link href={{ pathname: `/forms/${form.id}/design` }}>
              <FilePen className="mr-2 h-4 w-4" />
              Design
            </Link>
          </Button>
          <Button
            variant={"outline"}
            onClick={() => setIsShareDialogOpen(true)}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant={"outline"} asChild>
            <Link
              href={{
                pathname: `/forms/${form.id}/submissions`,
              }}
            >
              <List className="mr-1 h-4 w-4" />
              Submissions
            </Link>
          </Button>
          {enableAnalytics && (
            <Button variant="outline" asChild>
              <Link href={`/forms/${form.id}/analytics`}>
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics
              </Link>
            </Button>
          )}
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
                className="cursor-pointer text-destructive"
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
      <div className="mx-auto max-w-2xl">
        <SectionTitle title="Form details" headingClassName="text-xl mt-4" />
      </div>
      <div className="mx-auto grid max-w-2xl gap-2 py-4">
        <div className="grid grid-cols-4 items-center gap-4 py-2">
          <span className="self-start text-right">Created at</span>
          <span className="col-span-3 text-sm text-muted-foreground">
            {getFormattedDate(form.createdAt)}
          </span>
        </div>
        <div className="grid grid-cols-4 items-center gap-4 py-2">
          <span className="self-start text-right">Modified on</span>
          <span className="col-span-3 text-sm text-muted-foreground">
            {getFormattedDate(form.modifiedAt)}
          </span>
        </div>

        <div className="grid grid-cols-4 items-center gap-4 py-2">
          <span className="col-span-1 self-start text-right">Submissions</span>
          <div className="col-span-3 text-sm">
            {(form?.submissionsCount ?? 0) === 0 ? (
              <span className="text-muted-foreground">No submissions yet</span>
            ) : (
              <span className="text-base font-medium">
                {form.submissionsCount ?? 0}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 items-center gap-4 py-2">
          <span className="self-start text-right">Status</span>
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

        <div className="grid grid-cols-4 items-center gap-4 py-2">
          <span className="self-start text-right">Visibility</span>
          <div className="col-span-3 flex items-center space-x-2">
            {enableEditing ? (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="inline-flex"
                        data-testid="form-visibility-tooltip-trigger"
                      >
                        <Switch
                          id="form-visibility"
                          checked={isPublic}
                          onCheckedChange={toggleVisibility}
                          disabled={visibilityDisabled}
                          aria-readonly
                        />
                      </span>
                    </TooltipTrigger>
                    {visibilityDisabled && visibilityDisabledReason && (
                      <TooltipContent side="top" sideOffset={6}>
                        {visibilityDisabledReason}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                <Label
                  htmlFor="form-visibility"
                  className="flex items-center gap-1"
                >
                  {isPublic ? (
                    <Globe className="h-3 w-3" />
                  ) : (
                    <Lock className="h-3 w-3" />
                  )}
                  {visibilityLabel}
                </Label>
              </>
            ) : (
              <Badge
                variant={isPublic ? "default" : "secondary"}
                className="flex w-fit items-center gap-1"
              >
                {isPublic ? (
                  <Globe className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                {visibilityLabel}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 items-center gap-4 py-2">
          <span className="self-start text-right">Limit one per user</span>
          <div className="col-span-3 flex flex-col gap-1">
            <div className="flex items-center space-x-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      className="inline-flex"
                      data-testid="form-limit-one-tooltip-trigger"
                    >
                      <Switch
                        id="form-limit-one"
                        checked={limitOnePerUser}
                        onCheckedChange={handleLimitOnePerUserChange}
                        disabled={limitOnePerUserDisabled}
                        aria-readonly
                      />
                    </span>
                  </TooltipTrigger>
                  {limitOnePerUserDisabled && limitOnePerUserDisabledReason && (
                    <TooltipContent side="top" sideOffset={6}>
                      {limitOnePerUserDisabledReason}
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <Label htmlFor="form-limit-one">
                {limitOnePerUser ? "Enabled" : "Disabled"}
              </Label>
            </div>
            {isPublic && (
              <span className="text-xs text-muted-foreground">
                This option is available only for private forms.
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 items-center gap-4 py-2">
          <span className="self-start pt-2 text-right">
            Session expiry (hours)
          </span>
          <div className="col-span-3">
            {enableEditing ? (
              <SessionExpiryHoursControl
                id="form-token-expiry-hours"
                variant="form"
                showLabel={false}
                value={tokenExpiryHoursInput}
                onChange={setTokenExpiryHoursInput}
                organizationDefaultHours={organizationDefaultHours}
                isOverridden={isTokenExpiryOverridden}
                onRestoreDefault={restoreSubmissionTokenExpiryDefault}
                onCommit={updateSubmissionTokenExpiry}
                showCommit={isTokenExpiryDirty}
                disabled={pending}
              />
            ) : (
              <div className="flex flex-col gap-1">
                <span className="text-sm">
                  {isTokenExpiryOverridden
                    ? formatSessionExpiryHours(form.submissionTokenExpiryHours!)
                    : formatOrganizationDefaultLabel(organizationDefaultHours)}
                </span>
                {isTokenExpiryOverridden ? (
                  <span className="text-xs text-muted-foreground">
                    Organization default:{" "}
                    {formatSessionExpiryHours(organizationDefaultHours)}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {enableEditing && (
          <div className="grid grid-cols-4 items-center gap-4 py-2">
            <span className="self-start pt-2 text-right">Folder</span>
            <div className="col-span-3">
              <Select
                value={selectedFolderId}
                onValueChange={applyFolderChange}
                disabled={pending}
              >
                <SelectTrigger className="w-full max-w-md">
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No folder</SelectItem>
                  {folderSelectItems.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 items-start gap-4 py-2">
          <span className="self-start pt-2 text-right">Metadata (JSON)</span>
          <div className="col-span-3 space-y-2">
            <Textarea
              value={metadata}
              onChange={(event) => setMetadata(event.target.value)}
              rows={6}
              disabled={pending}
              placeholder='{"key":"value"}'
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveMetadata}
              disabled={pending}
            >
              Save metadata
            </Button>
          </div>
        </div>
      </div>

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

      <AlertDialog
        open={isEnableLimitWarningOpen}
        onOpenChange={setIsEnableLimitWarningOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Enable &quot;one response per person&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              After you turn this on, each signed-in person can submit this form
              only once.{" "}
              <strong>
                To protect the integrity of collected responses, this setting is
                permanent.
              </strong>{" "}
              <strong>
                You will also not be able to make the form public later.
              </strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEnableLimitOnePerUser}>
              Enable permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isEnableLimitErrorOpen}
        onOpenChange={setIsEnableLimitErrorOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Could not enable &quot;one response per person&quot;
            </AlertDialogTitle>
            <AlertDialogDescription>
              {enableLimitErrorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Dismiss</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FormDetails;
