"use client";

import { listFoldersAction } from "@/features/folders/server";
import { getTenantSettingsAction } from "@/features/forms/application/actions/get-tenant-settings.action";
import type { Folder } from "@/lib/endatix-api/folders/types";
import { Result } from "@/lib/result";
import { useEffect, useState } from "react";

interface UseCreateFormSheetBootstrapOptions {
  initialFolders: Folder[];
  initialRequireFolderAssignment: boolean;
}

export function useCreateFormSheetBootstrap({
  initialFolders,
  initialRequireFolderAssignment,
}: UseCreateFormSheetBootstrapOptions) {
  const [requireFolderAssignment, setRequireFolderAssignment] = useState(
    initialRequireFolderAssignment,
  );
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [foldersReady, setFoldersReady] = useState(initialFolders.length > 0);

  useEffect(() => {
    setRequireFolderAssignment(initialRequireFolderAssignment);
    setFolders(initialFolders);
    setFoldersReady(initialFolders.length > 0);
  }, [initialFolders, initialRequireFolderAssignment]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const tenantSettingsResult = await getTenantSettingsAction();
      if (!cancelled && Result.isSuccess(tenantSettingsResult)) {
        setRequireFolderAssignment(
          tenantSettingsResult.value.requireFolderAssignment === true,
        );
      }

      if (initialFolders.length > 0) {
        return;
      }

      const foldersResult = await listFoldersAction();
      if (cancelled) {
        return;
      }

      if (Result.isSuccess(foldersResult)) {
        setFolders(foldersResult.value.filter((folder) => folder.isActive));
      }

      setFoldersReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [initialFolders.length]);

  return {
    folders,
    foldersReady,
    requireFolderAssignment,
  };
}
