"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import {
  parseSessionExpiryHoursInput,
  SessionExpiryHoursControl,
  sessionExpiryHoursToInput,
} from "@/features/forms/manage-session-expiry";
import { patchTenantSettingsAction } from "@/features/tenant/application/patch-tenant-settings.action";
import { Result } from "@/lib/result";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type OrganizationFormsSettingsFormProps = {
  initialRequireFolderAssignment: boolean;
  initialSubmissionTokenExpiryHours: number | null;
};

export function OrganizationFormsSettingsForm({
  initialRequireFolderAssignment,
  initialSubmissionTokenExpiryHours,
}: Readonly<OrganizationFormsSettingsFormProps>) {
  const router = useRouter();
  const [requireFolder, setRequireFolder] = useState(
    initialRequireFolderAssignment,
  );
  const [tokenExpiryHoursInput, setTokenExpiryHoursInput] = useState(
    sessionExpiryHoursToInput(initialSubmissionTokenExpiryHours),
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRequireFolder(initialRequireFolderAssignment);
    setTokenExpiryHoursInput(
      sessionExpiryHoursToInput(initialSubmissionTokenExpiryHours),
    );
  }, [initialRequireFolderAssignment, initialSubmissionTokenExpiryHours]);

  const save = () => {
    const parsed = parseSessionExpiryHoursInput(tokenExpiryHoursInput);
    if (!parsed.ok) {
      toast.error(
        `${parsed.message} Leave empty for sessions that never expire.`,
      );
      return;
    }

    startTransition(async () => {
      const result = await patchTenantSettingsAction({
        requireFolderAssignment: requireFolder,
        ...(parsed.hours == null
          ? { clearSubmissionTokenExpiryHours: true }
          : { submissionTokenExpiryHours: parsed.hours }),
      });
      if (Result.isError(result)) {
        toast.error(result.message);
        return;
      }
      toast.success("Organization form settings updated");
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
        <div className="space-y-1">
          <Label htmlFor="require-folder">
            Require folder for forms & templates
          </Label>
          <p className="text-sm text-muted-foreground">
            When enabled, new forms and templates must be assigned to a folder.
            Existing items can be updated in their settings.
          </p>
        </div>
        <Switch
          id="require-folder"
          checked={requireFolder}
          onCheckedChange={setRequireFolder}
          disabled={pending}
        />
      </div>

      <div className="rounded-lg border p-4">
        <SessionExpiryHoursControl
          id="org-token-expiry-hours"
          variant="organization"
          value={tokenExpiryHoursInput}
          onChange={setTokenExpiryHoursInput}
          organizationDefaultHours={initialSubmissionTokenExpiryHours}
          disabled={pending}
        />
      </div>

      <Button type="button" onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
