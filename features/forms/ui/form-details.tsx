"use client";

import { Button } from "@/components/ui/button";
import { Globe, Lock } from "lucide-react";
import { Form } from "@/types";
import { SectionTitle } from "@/components/headings/section-title";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTransition, useState, useEffect, useMemo } from "react";
import { updateFormStatusAction } from "../application/actions/update-form-status.action";
import { updateFormVisibilityAction } from "../application/actions/update-form-visibility.action";
import { toast } from "@/components/ui/toast";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Result } from "@/lib/result";
import { getFormattedDate } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { WebhookSettings } from "./webhook-settings";
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

interface FormDetailsProps {
  form: Form;
  enableEditing?: boolean;
}

const FormDetails = ({ form, enableEditing = false }: FormDetailsProps) => {
  const [pending, startTransition] = useTransition();
  const [isEnabled, setIsEnabled] = useState(form?.isEnabled);
  const [isPublic, setIsPublic] = useState(form?.isPublic);
  const [limitOnePerUser, setLimitOnePerUser] = useState(
    form?.limitOnePerUser ?? false,
  );
  const [tokenExpiryHoursInput, setTokenExpiryHoursInput] = useState(
    sessionExpiryHoursToInput(form?.submissionTokenExpiryHours),
  );
  const [tokenExpiryInputError, setTokenExpiryInputError] = useState<
    string | null
  >(null);
  const [tokenExpirySyncedFrom, setTokenExpirySyncedFrom] = useState({
    formId: form.id,
    committed: sessionExpiryHoursToInput(form.submissionTokenExpiryHours),
  });
  const [organizationDefaultHours, setOrganizationDefaultHours] =
    useState<SessionExpiryHours>(null);
  const [metadata, setMetadata] = useState(form?.metadata ?? "");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    () => form.folderId ?? "__none__",
  );
  const [isEnableLimitWarningOpen, setIsEnableLimitWarningOpen] =
    useState(false);
  const [isEnableLimitErrorOpen, setIsEnableLimitErrorOpen] = useState(false);
  const [enableLimitErrorMessage, setEnableLimitErrorMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    setSelectedFolderId(form.folderId ?? "__none__");
  }, [form.id, form.folderId]);

  const committedTokenExpiryInput = sessionExpiryHoursToInput(
    form.submissionTokenExpiryHours,
  );
  if (
    form.id !== tokenExpirySyncedFrom.formId ||
    committedTokenExpiryInput !== tokenExpirySyncedFrom.committed
  ) {
    setTokenExpirySyncedFrom({
      formId: form.id,
      committed: committedTokenExpiryInput,
    });
    setTokenExpiryHoursInput(committedTokenExpiryInput);
    setTokenExpiryInputError(null);
  }

  useEffect(() => {
    let cancelled = false;
    void getTenantSettingsAction().then((result) => {
      if (cancelled) {
        return;
      }

      if (Result.isError(result)) {
        toast.error(
          "Failed to load organization session expiry default. Error: " +
            result.message,
        );
        return;
      }

      if (!Result.isSuccess(result)) {
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

  const isTokenExpiryDirty =
    tokenExpiryHoursInput.trim() !== committedTokenExpiryInput;
  const isTokenExpiryOverridden = form.submissionTokenExpiryHours != null;

  const updateSubmissionTokenExpiry = () => {
    const previous = committedTokenExpiryInput;
    const parsed = parseSessionExpiryHoursInput(tokenExpiryHoursInput);
    if (!parsed.ok) {
      setTokenExpiryInputError(parsed.message);
      return;
    }

    setTokenExpiryInputError(null);

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
    setTokenExpiryInputError(null);
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

  return (
    <div>
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
                onChange={(value) => {
                  setTokenExpiryInputError(null);
                  setTokenExpiryHoursInput(value);
                }}
                organizationDefaultHours={organizationDefaultHours}
                isOverridden={isTokenExpiryOverridden}
                onRestoreDefault={restoreSubmissionTokenExpiryDefault}
                onCommit={updateSubmissionTokenExpiry}
                showCommit={isTokenExpiryDirty}
                disabled={pending}
                error={tokenExpiryInputError}
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
