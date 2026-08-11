"use client";

import { toast } from "@/components/ui/toast";
import type { DataListDetails } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { X } from "lucide-react";
import { useTransition } from "react";
import {
  removeDataListLocaleAction,
  setDataListDefaultLocaleAction,
} from "@/features/data-lists/translations/translations-csv.action";
import { formatLocaleLabel } from "@/features/data-lists/translations/locale-discovery";

type LocaleCatalogPanelProps = {
  details: DataListDetails;
  onUpdated: (details: DataListDetails) => void;
};

export function LocaleCatalogPanel({
  details,
  onUpdated,
}: Readonly<LocaleCatalogPanelProps>) {
  const [isPending, startTransition] = useTransition();
  const availableLocales = details.availableLocales ?? [];

  const handleRemove = (locale: string): void => {
    startTransition(async () => {
      const result = await removeDataListLocaleAction(
        String(details.id),
        locale,
      );
      if (Result.isError(result)) {
        toast.error(result.message);
        return;
      }

      onUpdated(result.value);
      toast.success(`Removed locale ${locale}`);
    });
  };

  const handleSetDefault = (locale: string): void => {
    startTransition(async () => {
      const result = await setDataListDefaultLocaleAction(
        String(details.id),
        locale,
      );
      if (Result.isError(result)) {
        toast.error(result.message);
        return;
      }

      onUpdated(result.value);
      toast.success(`Default locale set to ${locale}`);
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-surface-container-lowest px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">Locales</p>
        <p className="text-xs text-muted-foreground">
          Default: {details.defaultLocale ?? "—"} · New cultures are added
          during CSV/JSON import
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {details.defaultLocale ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-surface-container-low px-2 py-1 text-xs">
            {formatLocaleLabel(details.defaultLocale)} (default)
          </span>
        ) : null}
        {availableLocales.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            No additional locales yet
          </span>
        ) : (
          availableLocales.map((locale) => (
            <span
              key={locale}
              className="inline-flex items-center gap-1 rounded-md border border-border/50 px-2 py-1 text-xs"
            >
              <button
                type="button"
                className="hover:underline"
                disabled={isPending}
                title="Set as default"
                onClick={() => handleSetDefault(locale)}
              >
                {formatLocaleLabel(locale)}
              </button>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                disabled={isPending}
                aria-label={`Remove ${locale}`}
                onClick={() => handleRemove(locale)}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
      </div>
    </div>
  );
}
