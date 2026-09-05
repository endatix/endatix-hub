"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileKindLabel } from "@/components/common/file-kind-icon";
import { getExportDeliveryFileKind } from "@/features/export/utils";
import type {
  ExportDeliveryFormat,
  ExportProfile,
  ExportTarget,
} from "@/lib/endatix-api/reporting/export-format-types";

interface CatalogOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

function FieldError({ message }: Readonly<{ message?: string }>) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive">{message}</p>;
}

interface ExportFormatTypeFieldsProps {
  mode: string;
  exportTarget: ExportTarget | "";
  deliveryFormat: ExportDeliveryFormat | "";
  profile: ExportProfile | "";
  showVariant: boolean;
  availableTargets: ReadonlyArray<CatalogOption<ExportTarget>>;
  availableDeliveryFormats: ReadonlyArray<CatalogOption<ExportDeliveryFormat>>;
  availableProfiles: ReadonlyArray<CatalogOption<ExportProfile>>;
  selectedProfileDescription?: string;
  fieldErrors?: {
    exportTarget?: string;
    deliveryFormat?: string;
    profile?: string;
  };
  onTargetChange: (value: ExportTarget) => void;
  onDeliveryChange: (value: ExportDeliveryFormat) => void;
  onProfileChange: (value: ExportProfile) => void;
}

export function ExportFormatTypeFields({
  mode,
  exportTarget,
  deliveryFormat,
  profile,
  showVariant,
  availableTargets,
  availableDeliveryFormats,
  availableProfiles,
  selectedProfileDescription,
  fieldErrors,
  onTargetChange,
  onDeliveryChange,
  onProfileChange,
}: Readonly<ExportFormatTypeFieldsProps>) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${mode}-exportTarget`}>Export target</Label>
        <Select
          value={exportTarget || undefined}
          onValueChange={(value) => onTargetChange(value as ExportTarget)}
          disabled={availableTargets.length === 0}
        >
          <SelectTrigger id={`${mode}-exportTarget`}>
            <SelectValue placeholder="Select export target" />
          </SelectTrigger>
          <SelectContent>
            {availableTargets.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={fieldErrors?.exportTarget} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${mode}-deliveryFormat`}>Delivery format</Label>
        <Select
          value={deliveryFormat || undefined}
          onValueChange={(value) =>
            onDeliveryChange(value as ExportDeliveryFormat)
          }
          disabled={availableDeliveryFormats.length === 0}
        >
          <SelectTrigger id={`${mode}-deliveryFormat`}>
            <SelectValue placeholder="Select delivery format" />
          </SelectTrigger>
          <SelectContent>
            {availableDeliveryFormats.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <FileKindLabel kind={getExportDeliveryFileKind(option.value)}>
                  {option.label}
                </FileKindLabel>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError message={fieldErrors?.deliveryFormat} />
      </div>

      {showVariant ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${mode}-profile`}>Variant</Label>
          <Select
            value={profile || undefined}
            onValueChange={(value) => onProfileChange(value as ExportProfile)}
            disabled={availableProfiles.length === 0}
          >
            <SelectTrigger id={`${mode}-profile`}>
              <SelectValue placeholder="Select variant">
                {
                  availableProfiles.find((option) => option.value === profile)
                    ?.label
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {availableProfiles.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="items-start py-2"
                >
                  <span className="flex flex-col gap-0.5 whitespace-normal">
                    <span>{option.label}</span>
                    {option.description ? (
                      <span className="text-xs font-normal text-muted-foreground">
                        {option.description}
                      </span>
                    ) : null}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedProfileDescription ? (
            <p className="text-sm text-muted-foreground">
              {selectedProfileDescription}
            </p>
          ) : null}
          <FieldError message={fieldErrors?.profile} />
        </div>
      ) : null}
    </>
  );
}
