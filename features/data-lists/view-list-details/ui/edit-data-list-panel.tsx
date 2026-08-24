'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ResponsivePanel,
  ResponsivePanelBody,
  ResponsivePanelDescription,
  ResponsivePanelFooter,
  ResponsivePanelHeader,
  ResponsivePanelTitle,
} from '@/components/ui/responsive-panel';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/toast';
import { formatLocaleLabel } from '@/features/data-lists/translations/locale-discovery';
import { setDataListDefaultLocaleAction } from '@/features/data-lists/translations/translations-csv.action';
import { RemoveLocaleConfirmDialog } from '@/features/data-lists/remove-locale';
import type { DataListDetails } from '@/lib/endatix-api/data-lists/types';
import { Result } from '@/lib/result';
import { DATA_LIST_NAME_MAX_LENGTH } from '@/lib/survey-features/data-lists/constants';
import { validateEndatixId } from '@/lib/utils/type-validators';
import { X } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';
import { updateDataListDetailsAction } from '../update-data-list-details.action';

type EditDataListPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  details: DataListDetails;
  onUpdated: (details: DataListDetails) => void;
};

export function EditDataListPanel({
  open,
  onOpenChange,
  details,
  onUpdated,
}: Readonly<EditDataListPanelProps>) {
  const [name, setName] = useState(details.name);
  const [description, setDescription] = useState(details.description ?? '');
  const [isSaving, startSaveTransition] = useTransition();
  const [isLocalePending, startLocaleTransition] = useTransition();
  const [isRemovePending, setIsRemovePending] = useState(false);
  const [localePendingRemoval, setLocalePendingRemoval] = useState<
    string | null
  >(null);

  const dataListIdResult = validateEndatixId(String(details.id), 'dataListId');
  const hasValidId = Result.isSuccess(dataListIdResult);
  const availableLocales = details.availableLocales ?? [];
  const isNameEmpty = name.trim().length === 0;
  const controlsDisabled =
    isSaving ||
    isLocalePending ||
    isRemovePending ||
    localePendingRemoval !== null ||
    !hasValidId;
  const saveDisabled = controlsDisabled || isNameEmpty;

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(details.name);
    setDescription(details.description ?? '');
  }, [open, details.name, details.description]);

  const requireDataListId = (): string | null => {
    if (Result.isError(dataListIdResult)) {
      toast.error(dataListIdResult.message);
      return null;
    }

    return dataListIdResult.value;
  };

  const handleSave = (): void => {
    const dataListId = requireDataListId();
    if (dataListId === null) {
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      return;
    }

    startSaveTransition(async () => {
      const result = await updateDataListDetailsAction(dataListId, {
        name: trimmedName,
        description: description.trim(),
      });
      if (Result.isError(result)) {
        toast.error(result.message);
        return;
      }

      onUpdated(result.value);
      toast.success('Data list updated');
      onOpenChange(false);
    });
  };

  const handleSetDefault = (locale: string): void => {
    const dataListId = requireDataListId();
    if (dataListId === null) {
      return;
    }

    startLocaleTransition(async () => {
      const result = await setDataListDefaultLocaleAction(dataListId, locale);
      if (Result.isError(result)) {
        toast.error(result.message);
        return;
      }

      onUpdated(result.value);
      toast.success(`Default locale set to ${locale}`);
    });
  };

  return (
    <>
      <ResponsivePanel
        desktopType="complex"
        open={open}
        onOpenChange={onOpenChange}
      >
        <div className="flex h-full min-h-0 flex-col">
          <ResponsivePanelHeader>
            <ResponsivePanelTitle>Edit data list</ResponsivePanelTitle>
            <ResponsivePanelDescription>
              Update the name, description, and locale catalog for this list.
            </ResponsivePanelDescription>
          </ResponsivePanelHeader>
          <ResponsivePanelBody className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="edit-data-list-name">Friendly name</Label>
              <Input
                id="edit-data-list-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={controlsDisabled}
                autoComplete="off"
                maxLength={DATA_LIST_NAME_MAX_LENGTH}
                aria-invalid={isNameEmpty}
              />
              {isNameEmpty ? (
                <p className="text-xs text-destructive">Name is required.</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-data-list-description">Description</Label>
              <Textarea
                id="edit-data-list-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={controlsDisabled}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Locales</p>
              <p className="text-xs text-muted-foreground">
                Click a locale to set it as default. New cultures are added
                during CSV/JSON import.
              </p>
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
                        onClick={() => setLocalePendingRemoval(locale)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </ResponsivePanelBody>
          <ResponsivePanelFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saveDisabled}
            >
              {isSaving ? 'Saving…' : 'Save changes'}
            </Button>
          </ResponsivePanelFooter>
        </div>
      </ResponsivePanel>

      {hasValidId ? (
        <RemoveLocaleConfirmDialog
          open={localePendingRemoval !== null}
          onOpenChange={(dialogOpen) => {
            if (!dialogOpen) {
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
