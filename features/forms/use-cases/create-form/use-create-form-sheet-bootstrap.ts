"use client";

import { usePickerFolders } from "@/features/folders/list-folders";
import { getTenantSettingsAction } from "@/features/forms/application/actions/get-tenant-settings.action";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { Result } from "@/lib/result";
import { useEffect, useState } from "react";

interface BootstrapOptions {
  initialFolders: Folder[] | undefined;
  initialRequireFolderAssignment: boolean;
  open: boolean;
}

export function useCreateFormSheetBootstrap({
  initialFolders,
  initialRequireFolderAssignment,
  open,
}: BootstrapOptions) {
  const picker = usePickerFolders(
    open && !initialFolders?.length,
    initialFolders,
  );
  const [requireFolderAssignment, setRequireFolderAssignment] = useState(
    initialRequireFolderAssignment,
  );
  useEffect(() => {
    setRequireFolderAssignment(initialRequireFolderAssignment);
    if (!open) return;
    let current = true;
    void getTenantSettingsAction().then((result) => {
      if (current && Result.isSuccess(result))
        setRequireFolderAssignment(
          result.value.requireFolderAssignment === true,
        );
    });
    return () => {
      current = false;
    };
  }, [open, initialRequireFolderAssignment]);
  return {
    picker,
    folders: picker.folders?.filter((f) => f.isActive) ?? [],
    requireFolderAssignment,
  };
}
