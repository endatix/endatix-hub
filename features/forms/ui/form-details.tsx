"use client";

import { Form } from "@/types";
import { useTransition, useState, useEffect, useMemo } from "react";
import { flushSync } from "react-dom";
import { showStandingRefusal } from "@/components/error-handling/show-action-failure";
import { updateFormStatusAction } from "../application/actions/update-form-status.action";
import { updateFormVisibilityAction } from "../application/actions/update-form-visibility.action";
import { toast } from "@/components/ui/toast";
import { usePickerFolders } from "@/features/folders/list-folders";
import {
  Result,
  toActionFailure,
  type Error as ResultError,
} from "@/lib/result";
import { useRouter } from "next/navigation";
import { updateFormSettingsAction } from "../application/actions/update-form-settings.action";
import { getTenantSettingsAction } from "../application/actions/get-tenant-settings.action";
import {
  formatOrganizationDefaultLabel,
  formatSessionExpiryHours,
  parseSessionExpiryHoursInput,
  sessionExpiryHoursToInput,
  type SessionExpiryHours,
} from "@/features/forms/manage-session-expiry";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { FormDetailsView } from "./form-details-view";

interface FormDetailsProps {
  form: Form;
  enableEditing?: boolean;
}

function visibilityDisabledReason(
  limitOnePerUser: boolean,
  pending: boolean,
): string | undefined {
  if (limitOnePerUser) {
    return 'Visibility cannot be changed while "one response per person" is enabled.';
  }
  if (pending) {
    return "Please wait for the current update to finish.";
  }
  return undefined;
}

function limitOneDisabledReason(
  limitOnePerUser: boolean,
  isPublic: boolean,
  pending: boolean,
): string | undefined {
  if (limitOnePerUser) {
    return "This setting is permanent once enabled.";
  }
  if (isPublic) {
    return "This option is available only for private forms.";
  }
  if (pending) {
    return "Please wait for the current update to finish.";
  }
  return undefined;
}

function errorMessage(result: Result<unknown> | undefined, fallback: string) {
  return result && Result.isError(result) ? result.message : fallback;
}

function showFolderChangeFailure(result: ResultError | undefined) {
  if (result?.requiredAction) return showStandingRefusal(result.requiredAction);
  const [title, ...rest] = (result?.message ?? "").split(". ");
  toast.error({
    title: title || "Failed to update folder",
    description: rest.join(". ").trim() || undefined,
  });
}

function showSettingFailure(error: ResultError | undefined, message: string) {
  if (error?.requiredAction) return showStandingRefusal(error.requiredAction);
  return toast.error(`${message}. Error: ${error?.message ?? ""}`);
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
  const picker = usePickerFolders(enableEditing);
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

  const folderSelectItems = useMemo(() => {
    const folders = picker.folders ?? [];
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
  }, [picker.folders, form.folderId]);

  const enabledLabel = form?.isEnabled ? "Enabled" : "Disabled";
  const visibilityLabel = isPublic ? "Public" : "Private";
  const limitOnePerUserDisabled = limitOnePerUser || isPublic || pending;
  const visibilityDisabled = pending || limitOnePerUser;
  const isTokenExpiryDirty =
    tokenExpiryHoursInput.trim() !== committedTokenExpiryInput;
  const isTokenExpiryOverridden = form.submissionTokenExpiryHours != null;

  const toggleEnabled = (enabled: boolean) => {
    setIsEnabled(enabled);
    startTransition(async () => {
      const updateStatusResult = await updateFormStatusAction(form.id, enabled);
      if (updateStatusResult === undefined) {
        toast.error("Could not proceed with updating form status");
        return;
      }

      if (Result.isError(updateStatusResult)) {
        setIsEnabled(!enabled);
        showSettingFailure(updateStatusResult, "Failed to update form status");
        return;
      }

      toast.success(`Form is now ${enabled ? "enabled" : "disabled"}`);
    });
  };

  const toggleVisibility = (publicValue: boolean) => {
    setIsPublic(publicValue);

    startTransition(async () => {
      const result = await updateFormVisibilityAction(form.id, publicValue);
      if (result === undefined) {
        toast.error("Could not proceed with updating form visibility");
        return;
      }

      if (Result.isError(result)) {
        setIsPublic(!publicValue);
        showSettingFailure(result, "Failed to update form visibility");
        return;
      }

      toast.success(`Form is now ${publicValue ? "public" : "private"}`);
    });
  };

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
        showSettingFailure(result, "Failed to update session expiry");
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
        showSettingFailure(result, "Failed to restore session expiry");
        return;
      }

      toast.success(
        `Session expiry restored to ${formatOrganizationDefaultLabel(organizationDefaultHours).toLowerCase()}`,
      );
    });
  };

  const updateLimitOnePerUser = (checked: boolean) => {
    setLimitOnePerUser(checked);
    startTransition(async () => {
      const result = await updateFormSettingsAction(form.id, {
        limitOnePerUser: checked,
      });

      if (result === undefined || Result.isError(result)) {
        setLimitOnePerUser(!checked);
        if (checked && !result?.requiredAction) {
          setEnableLimitErrorMessage(
            errorMessage(
              result,
              "Could not proceed with updating single-response setting.",
            ),
          );
          setIsEnableLimitErrorOpen(true);
          return;
        }

        showSettingFailure(result, "Failed to update single-response setting");
        return;
      }

      toast.success(
        checked
          ? "Single response per user is enabled"
          : "Single response per user is disabled",
      );
    });
  };

  const handleLimitOnePerUserChange = (checked: boolean) => {
    if (checked && !limitOnePerUser) {
      setIsEnableLimitWarningOpen(true);
      return;
    }

    updateLimitOnePerUser(checked);
  };

  const handleConfirmEnableLimitOnePerUser = () => {
    setIsEnableLimitWarningOpen(false);
    updateLimitOnePerUser(true);
  };

  const applyFolderChange = (value: string) => {
    const previous = selectedFolderId;
    setSelectedFolderId(value);
    startTransition(async () => {
      const payload =
        value === "__none__" ? { clearFolderId: true } : { folderId: value };
      const result = await updateFormSettingsAction(form.id, payload).catch(
        toActionFailure<string>("Failed to update folder. Try again."),
      );

      if (result === undefined || Result.isError(result)) {
        // A standing refusal can navigate immediately; commit the rollback before presenting it.
        flushSync(() => setSelectedFolderId(previous));
        showFolderChangeFailure(result);
        return;
      }

      toast.success(value === "__none__" ? "Folder cleared" : "Folder updated");
      router.refresh();
    });
  };

  const handleSaveMetadata = () => {
    startTransition(async () => {
      const result = await updateFormSettingsAction(form.id, {
        metadata: metadata.trim() === "" ? null : metadata,
      });

      if (result === undefined || Result.isError(result)) {
        showSettingFailure(result, "Failed to update metadata");
        return;
      }

      toast.success("Form metadata updated");
    });
  };

  return (
    <FormDetailsView
      form={form}
      enableEditing={enableEditing}
      pending={pending}
      isEnabled={isEnabled}
      isPublic={isPublic}
      limitOnePerUser={limitOnePerUser}
      tokenExpiryHoursInput={tokenExpiryHoursInput}
      tokenExpiryInputError={tokenExpiryInputError}
      organizationDefaultHours={organizationDefaultHours}
      metadata={metadata}
      selectedFolderId={selectedFolderId}
      folderRead={picker}
      folderSelectItems={folderSelectItems}
      isEnableLimitWarningOpen={isEnableLimitWarningOpen}
      isEnableLimitErrorOpen={isEnableLimitErrorOpen}
      enableLimitErrorMessage={enableLimitErrorMessage}
      enabledLabel={enabledLabel}
      visibilityLabel={visibilityLabel}
      limitOnePerUserDisabled={limitOnePerUserDisabled}
      visibilityDisabled={visibilityDisabled}
      visibilityDisabledReason={visibilityDisabledReason(
        limitOnePerUser,
        pending,
      )}
      limitOnePerUserDisabledReason={limitOneDisabledReason(
        limitOnePerUser,
        isPublic,
        pending,
      )}
      isTokenExpiryDirty={isTokenExpiryDirty}
      isTokenExpiryOverridden={isTokenExpiryOverridden}
      onToggleEnabled={toggleEnabled}
      onToggleVisibility={toggleVisibility}
      onLimitOnePerUserChange={handleLimitOnePerUserChange}
      onConfirmEnableLimitOnePerUser={handleConfirmEnableLimitOnePerUser}
      onTokenExpiryChange={(value) => {
        setTokenExpiryInputError(null);
        setTokenExpiryHoursInput(value);
      }}
      onRestoreTokenExpiryDefault={restoreSubmissionTokenExpiryDefault}
      onCommitTokenExpiry={updateSubmissionTokenExpiry}
      onFolderChange={applyFolderChange}
      onMetadataChange={setMetadata}
      onSaveMetadata={handleSaveMetadata}
      onEnableLimitWarningOpenChange={setIsEnableLimitWarningOpen}
      onEnableLimitErrorOpenChange={setIsEnableLimitErrorOpen}
    />
  );
};

export default FormDetails;
