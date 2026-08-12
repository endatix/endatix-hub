"use client";

import { toast } from "@/components/ui/toast";
import type { DataListDetails } from "@/lib/endatix-api/data-lists/types";
import { Result } from "@/lib/result";
import { validateEndatixId } from "@/lib/utils/type-validators";
import { X } from "lucide-react";
import { useState, useTransition } from "react";
import { setDataListDefaultLocaleAction } from "@/features/data-lists/translations/translations-csv.action";
import { formatLocaleLabel } from "@/features/data-lists/translations/locale-discovery";
import { RemoveLocaleConfirmDialog } from "@/features/data-lists/remove-locale";

type LocaleCatalogPanelProps = {
  details: DataListDetails;
  onUpdated: (details: DataListDetails) => void;
};

export function LocaleCatalogPanel({
  details,
  onUpdated,
}: Readonly<LocaleCatalogPanelProps>) {
  const [isPending, startTransition] = useTransition();
  const [isRemovePending, setIsRemovePending] = useState(false);
  const [localePendingRemoval, setLocalePendingRemoval] = useState<
    string | null
  >(null);
  const availableLocales = details.availableLocales ?? [];
  const dataListIdResult = validateEndatixId(String(details.id), "dataListId");
  const hasValidDataListId = Result.isSuccess(dataListIdResult);
  const controlsDisabled = isPending || isRemovePending || !hasValidDataListId;

  const requireDataListId = (): string | null => {
    if (Result.isError(dataListIdResult)) {
      toast.error(dataListIdResult.message);
      return null;
    }

    return dataListIdResult.value;
  };

  const handleSetDefault = (locale: string): void => {
    const dataListId = requireDataListId();
    if (dataListId === null) {
      return;
    }

    startTransition(async () => {
      const result = await setDataListDefaultLocaleAction(dataListId, locale);
      if (Result.isError(result)) {
        toast.error(result.message);
        return;
      }

      onUpdated(result.value);
      toast.success(`Default locale set to ${locale}`);
    });
  };

  const handleRequestRemove = (locale: string): void => {
    if (requireDataListId() === null || controlsDisabled) {
      return;
    }

    setLocalePendingRemoval(locale);
  };

  return (
    <>
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
                  disabled={controlsDisabled}
                  title="Set as default"
                  onClick={() => handleSetDefault(locale)}
                >
                  {formatLocaleLabel(locale)}
                </button>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={controlsDisabled}
                  aria-label={`Remove ${locale}`}
                  onClick={() => handleRequestRemove(locale)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>
      </div>

      {hasValidDataListId ? (
        <RemoveLocaleConfirmDialog
          open={localePendingRemoval !== null}
          onOpenChange={(open) => {
            if (!open) {
              setLocalePendingRemoval(null);
            }
          }}
          dataListId={dataListIdResult.value}
          locale={localePendingRemoval}
          onRemoved={onUpdated}
          onPendingChange={setIsRemovePending}
        />
      ) : null}
    </>
  );
}
