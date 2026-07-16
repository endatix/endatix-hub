"use client";

import { useEffect, useMemo, useState } from "react";
import { listTenantExportFormatsAction } from "@/features/export/manage-export-formats";
import { Result } from "@/lib/result";
import {
  groupTenantExportOptions,
  mapFormatsToTenantExportOptions,
  type TenantExportOption,
  type TenantExportOptionGroup,
} from "./map-tenant-export-options";

export type { TenantExportOption, TenantExportOptionGroup };

export function useTenantExportFormats() {
  const [options, setOptions] = useState<TenantExportOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFormats() {
      setIsLoading(true);
      setLoadError(null);

      const result = await listTenantExportFormatsAction();

      if (cancelled) {
        return;
      }

      if (Result.isSuccess(result)) {
        setOptions(mapFormatsToTenantExportOptions(result.value));
      } else {
        setOptions([]);
        setLoadError(result.message);
      }

      setIsLoading(false);
    }

    loadFormats().catch(() => {
      if (!cancelled) {
        setOptions([]);
        setLoadError("Failed to load export formats.");
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo<TenantExportOptionGroup[]>(
    () => groupTenantExportOptions(options),
    [options],
  );

  return {
    options,
    groups,
    isLoading,
    isEmpty: !isLoading && options.length === 0,
    loadError,
  };
}
