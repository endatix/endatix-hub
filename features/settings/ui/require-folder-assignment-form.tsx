"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { patchTenantSettingsAction } from "@/features/tenant/application/patch-tenant-settings.action";
import { Result } from "@/lib/result";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type RequireFolderAssignmentFormProps = {
  initialRequireFolderAssignment: boolean;
};

export function RequireFolderAssignmentForm({
  initialRequireFolderAssignment,
}: RequireFolderAssignmentFormProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialRequireFolderAssignment);
  const [pending, startTransition] = useTransition();

  const save = () => {
    startTransition(async () => {
      const result = await patchTenantSettingsAction(enabled);
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
          checked={enabled}
          onCheckedChange={setEnabled}
          disabled={pending}
        />
      </div>
      <Button type="button" onClick={save} disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
