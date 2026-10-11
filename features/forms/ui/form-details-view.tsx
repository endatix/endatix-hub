"use client";

import { Button } from "@/components/ui/button";
import { Globe, Lock } from "lucide-react";
import { Form } from "@/types";
import { SectionTitle } from "@/components/headings/section-title";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { getFormattedDate } from "@/lib/utils";
import { WebhookSettings } from "./webhook-settings";
import {
  formatOrganizationDefaultLabel,
  formatSessionExpiryHours,
  SessionExpiryHoursControl,
  type SessionExpiryHours,
} from "@/features/forms/manage-session-expiry";
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

export type FormDetailsViewProps = {
  form: Form;
  enableEditing: boolean;
  pending: boolean;
  isEnabled: boolean;
  isPublic: boolean;
  limitOnePerUser: boolean;
  tokenExpiryHoursInput: string;
  tokenExpiryInputError: string | null;
  organizationDefaultHours: SessionExpiryHours;
  metadata: string;
  selectedFolderId: string;
  folderSelectItems: Folder[];
  isEnableLimitWarningOpen: boolean;
  isEnableLimitErrorOpen: boolean;
  enableLimitErrorMessage: string;
  enabledLabel: string;
  visibilityLabel: string;
  limitOnePerUserDisabled: boolean;
  visibilityDisabled: boolean;
  visibilityDisabledReason: string | undefined;
  limitOnePerUserDisabledReason: string | undefined;
  isTokenExpiryDirty: boolean;
  isTokenExpiryOverridden: boolean;
  onToggleEnabled: (enabled: boolean) => void;
  onToggleVisibility: (publicValue: boolean) => void;
  onLimitOnePerUserChange: (checked: boolean) => void;
  onConfirmEnableLimitOnePerUser: () => void;
  onTokenExpiryChange: (value: string) => void;
  onRestoreTokenExpiryDefault: () => void;
  onCommitTokenExpiry: () => void;
  onFolderChange: (value: string) => void;
  onMetadataChange: (value: string) => void;
  onSaveMetadata: () => void;
  onEnableLimitWarningOpenChange: (open: boolean) => void;
  onEnableLimitErrorOpenChange: (open: boolean) => void;
};

export function FormDetailsView({
  form,
  enableEditing,
  pending,
  isEnabled,
  isPublic,
  limitOnePerUser,
  tokenExpiryHoursInput,
  tokenExpiryInputError,
  organizationDefaultHours,
  metadata,
  selectedFolderId,
  folderSelectItems,
  isEnableLimitWarningOpen,
  isEnableLimitErrorOpen,
  enableLimitErrorMessage,
  enabledLabel,
  visibilityLabel,
  limitOnePerUserDisabled,
  visibilityDisabled,
  visibilityDisabledReason,
  limitOnePerUserDisabledReason,
  isTokenExpiryDirty,
  isTokenExpiryOverridden,
  onToggleEnabled,
  onToggleVisibility,
  onLimitOnePerUserChange,
  onConfirmEnableLimitOnePerUser,
  onTokenExpiryChange,
  onRestoreTokenExpiryDefault,
  onCommitTokenExpiry,
  onFolderChange,
  onMetadataChange,
  onSaveMetadata,
  onEnableLimitWarningOpenChange,
  onEnableLimitErrorOpenChange,
}: FormDetailsViewProps) {
  return (
    <div>
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
            {(form.submissionsCount ?? 0) === 0 ? (
              <span className="text-muted-foreground">No submissions yet</span>
            ) : (
              <span className="text-base font-medium">
                {form.submissionsCount ?? 0}
              </span>
            )}
          </div>
        </div>

        <StatusRow
          enableEditing={enableEditing}
          isEnabled={isEnabled}
          enabledLabel={enabledLabel}
          pending={pending}
          formEnabled={form.isEnabled}
          onToggle={onToggleEnabled}
        />

        <VisibilityRow
          enableEditing={enableEditing}
          isPublic={isPublic}
          visibilityLabel={visibilityLabel}
          visibilityDisabled={visibilityDisabled}
          visibilityDisabledReason={visibilityDisabledReason}
          onToggle={onToggleVisibility}
        />

        <LimitOnePerUserRow
          isPublic={isPublic}
          limitOnePerUser={limitOnePerUser}
          limitOnePerUserDisabled={limitOnePerUserDisabled}
          limitOnePerUserDisabledReason={limitOnePerUserDisabledReason}
          onChange={onLimitOnePerUserChange}
        />

        <SessionExpiryRow
          enableEditing={enableEditing}
          form={form}
          tokenExpiryHoursInput={tokenExpiryHoursInput}
          tokenExpiryInputError={tokenExpiryInputError}
          organizationDefaultHours={organizationDefaultHours}
          isTokenExpiryDirty={isTokenExpiryDirty}
          isTokenExpiryOverridden={isTokenExpiryOverridden}
          pending={pending}
          onChange={onTokenExpiryChange}
          onRestoreDefault={onRestoreTokenExpiryDefault}
          onCommit={onCommitTokenExpiry}
        />

        {enableEditing ? (
          <div className="grid grid-cols-4 items-center gap-4 py-2">
            <span className="self-start pt-2 text-right">Folder</span>
            <div className="col-span-3">
              <Select
                value={selectedFolderId}
                onValueChange={onFolderChange}
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
        ) : null}

        <div className="grid grid-cols-4 items-start gap-4 py-2">
          <span className="self-start pt-2 text-right">Metadata (JSON)</span>
          <div className="col-span-3 space-y-2">
            <Textarea
              value={metadata}
              onChange={(event) => onMetadataChange(event.target.value)}
              rows={6}
              disabled={pending}
              placeholder='{"key":"value"}'
            />
            <Button
              type="button"
              variant="outline"
              onClick={onSaveMetadata}
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
        onOpenChange={onEnableLimitWarningOpenChange}
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
            <AlertDialogAction onClick={onConfirmEnableLimitOnePerUser}>
              Enable permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isEnableLimitErrorOpen}
        onOpenChange={onEnableLimitErrorOpenChange}
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
}

function StatusRow({
  enableEditing,
  isEnabled,
  enabledLabel,
  pending,
  formEnabled,
  onToggle,
}: Readonly<{
  enableEditing: boolean;
  isEnabled: boolean;
  enabledLabel: string;
  pending: boolean;
  formEnabled: boolean;
  onToggle: (enabled: boolean) => void;
}>) {
  return (
    <div className="grid grid-cols-4 items-center gap-4 py-2">
      <span className="self-start text-right">Status</span>
      <div className="col-span-3 flex items-center space-x-2">
        {enableEditing ? (
          <>
            <Switch
              id="form-status"
              checked={isEnabled}
              onCheckedChange={onToggle}
              disabled={pending}
              aria-readonly
            />
            <Label htmlFor="form-status">{enabledLabel}</Label>
          </>
        ) : (
          <Badge variant={formEnabled ? "default" : "secondary"}>
            {enabledLabel}
          </Badge>
        )}
      </div>
    </div>
  );
}

function VisibilityIcon({ isPublic }: Readonly<{ isPublic: boolean }>) {
  return isPublic ? (
    <Globe className="h-3 w-3" />
  ) : (
    <Lock className="h-3 w-3" />
  );
}

function VisibilityRow({
  enableEditing,
  isPublic,
  visibilityLabel,
  visibilityDisabled,
  visibilityDisabledReason,
  onToggle,
}: Readonly<{
  enableEditing: boolean;
  isPublic: boolean;
  visibilityLabel: string;
  visibilityDisabled: boolean;
  visibilityDisabledReason: string | undefined;
  onToggle: (publicValue: boolean) => void;
}>) {
  return (
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
                      onCheckedChange={onToggle}
                      disabled={visibilityDisabled}
                      aria-readonly
                    />
                  </span>
                </TooltipTrigger>
                {visibilityDisabled && visibilityDisabledReason ? (
                  <TooltipContent side="top" sideOffset={6}>
                    {visibilityDisabledReason}
                  </TooltipContent>
                ) : null}
              </Tooltip>
            </TooltipProvider>
            <Label
              htmlFor="form-visibility"
              className="flex items-center gap-1"
            >
              <VisibilityIcon isPublic={isPublic} />
              {visibilityLabel}
            </Label>
          </>
        ) : (
          <Badge
            variant={isPublic ? "default" : "secondary"}
            className="flex w-fit items-center gap-1"
          >
            <VisibilityIcon isPublic={isPublic} />
            {visibilityLabel}
          </Badge>
        )}
      </div>
    </div>
  );
}

function LimitOnePerUserRow({
  isPublic,
  limitOnePerUser,
  limitOnePerUserDisabled,
  limitOnePerUserDisabledReason,
  onChange,
}: Readonly<{
  isPublic: boolean;
  limitOnePerUser: boolean;
  limitOnePerUserDisabled: boolean;
  limitOnePerUserDisabledReason: string | undefined;
  onChange: (checked: boolean) => void;
}>) {
  return (
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
                    onCheckedChange={onChange}
                    disabled={limitOnePerUserDisabled}
                    aria-readonly
                  />
                </span>
              </TooltipTrigger>
              {limitOnePerUserDisabled && limitOnePerUserDisabledReason ? (
                <TooltipContent side="top" sideOffset={6}>
                  {limitOnePerUserDisabledReason}
                </TooltipContent>
              ) : null}
            </Tooltip>
          </TooltipProvider>
          <Label htmlFor="form-limit-one">
            {limitOnePerUser ? "Enabled" : "Disabled"}
          </Label>
        </div>
        {isPublic ? (
          <span className="text-xs text-muted-foreground">
            This option is available only for private forms.
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SessionExpiryRow({
  enableEditing,
  form,
  tokenExpiryHoursInput,
  tokenExpiryInputError,
  organizationDefaultHours,
  isTokenExpiryDirty,
  isTokenExpiryOverridden,
  pending,
  onChange,
  onRestoreDefault,
  onCommit,
}: Readonly<{
  enableEditing: boolean;
  form: Form;
  tokenExpiryHoursInput: string;
  tokenExpiryInputError: string | null;
  organizationDefaultHours: SessionExpiryHours;
  isTokenExpiryDirty: boolean;
  isTokenExpiryOverridden: boolean;
  pending: boolean;
  onChange: (value: string) => void;
  onRestoreDefault: () => void;
  onCommit: () => void;
}>) {
  return (
    <div className="grid grid-cols-4 items-center gap-4 py-2">
      <span className="self-start pt-2 text-right">Session expiry (hours)</span>
      <div className="col-span-3">
        {enableEditing ? (
          <SessionExpiryHoursControl
            id="form-token-expiry-hours"
            variant="form"
            showLabel={false}
            value={tokenExpiryHoursInput}
            onChange={onChange}
            organizationDefaultHours={organizationDefaultHours}
            isOverridden={isTokenExpiryOverridden}
            onRestoreDefault={onRestoreDefault}
            onCommit={onCommit}
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
  );
}
