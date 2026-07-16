"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ColumnAliasNamingConventionDto,
  ColumnAliasProfile,
  ExportCapabilityDto,
  ExportDeliveryFormat,
  ExportFormatListItem,
  ExportProfile,
  ExportTarget,
} from "@/lib/endatix-api/reporting/export-format-types";
import {
  EXPORT_TARGET_OPTIONS,
  getColumnAliasNamingConvention,
  getDefaultExportKeySeparator,
  getDeliveryFormatOptionsForTarget,
  getExportCapabilityForSelection,
  getExportFormatSettingsFieldVisibility,
  getExportFormatTypeLabel,
  getProfileOptionsForSelection,
} from "@/lib/endatix-api/reporting/export-format-types";

export interface ExportFormatFormValues {
  name: string;
  description: string;
  exportTarget: ExportTarget;
  deliveryFormat: ExportDeliveryFormat;
  profile: ExportProfile;
  aliasProfile: ColumnAliasProfile;
  keySeparator: string;
  includeTestSubmissions: boolean;
}

interface ExportFormatFormFieldsProps {
  capabilities: ExportCapabilityDto[];
  namingConventions: ColumnAliasNamingConventionDto[];
  mode: "create" | "edit";
  initialFormat?: ExportFormatListItem;
  fieldErrors?: Record<string, string[] | undefined>;
  defaultValues?: Partial<ExportFormatFormValues>;
}

function getInitialValues(
  mode: "create" | "edit",
  initialFormat?: ExportFormatListItem,
  defaultValues?: Partial<ExportFormatFormValues>,
): ExportFormatFormValues {
  if (mode === "edit" && initialFormat) {
    return {
      name: initialFormat.name,
      description: initialFormat.description ?? "",
      exportTarget: initialFormat.exportTarget,
      deliveryFormat: initialFormat.deliveryFormat,
      profile: initialFormat.profile,
      aliasProfile: initialFormat.settings.aliasProfile,
      keySeparator: initialFormat.settings.keySeparator,
      includeTestSubmissions: initialFormat.settings.includeTestSubmissions,
    };
  }

  const exportTarget = defaultValues?.exportTarget ?? "Submissions";
  const profile = defaultValues?.profile ?? "Native";

  return {
    name: defaultValues?.name ?? "",
    description: defaultValues?.description ?? "",
    exportTarget,
    deliveryFormat: defaultValues?.deliveryFormat ?? "Csv",
    profile,
    aliasProfile: defaultValues?.aliasProfile ?? "native",
    keySeparator:
      defaultValues?.keySeparator ??
      getDefaultExportKeySeparator(exportTarget, profile),
    includeTestSubmissions: defaultValues?.includeTestSubmissions ?? false,
  };
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive">{message}</p>;
}

export function ExportFormatFormFields({
  capabilities,
  namingConventions,
  mode,
  initialFormat,
  fieldErrors,
  defaultValues,
}: ExportFormatFormFieldsProps) {
  const [values, setValues] = useState<ExportFormatFormValues>(() =>
    getInitialValues(mode, initialFormat, defaultValues),
  );

  const selectedNamingConvention = useMemo(
    () =>
      getColumnAliasNamingConvention(values.aliasProfile, namingConventions),
    [namingConventions, values.aliasProfile],
  );

  const selectedProfileCapability = useMemo(
    () =>
      getExportCapabilityForSelection(
        values.exportTarget,
        values.deliveryFormat,
        values.profile,
        capabilities,
      ),
    [capabilities, values.deliveryFormat, values.exportTarget, values.profile],
  );

  const availableDeliveryFormats = useMemo(
    () => getDeliveryFormatOptionsForTarget(values.exportTarget, capabilities),
    [capabilities, values.exportTarget],
  );

  const availableProfiles = useMemo(
    () =>
      getProfileOptionsForSelection(
        values.exportTarget,
        values.deliveryFormat,
        capabilities,
      ),
    [capabilities, values.deliveryFormat, values.exportTarget],
  );

  const visibility = getExportFormatSettingsFieldVisibility(
    values.exportTarget,
    values.profile,
  );

  useEffect(() => {
    if (mode === "edit") {
      return;
    }

    const hasCurrentDelivery = availableDeliveryFormats.some(
      (option) => option.value === values.deliveryFormat,
    );

    if (!hasCurrentDelivery && availableDeliveryFormats.length > 0) {
      setValues((current) => ({
        ...current,
        deliveryFormat: availableDeliveryFormats[0].value,
      }));
    }
  }, [availableDeliveryFormats, mode, values.deliveryFormat]);

  useEffect(() => {
    if (mode === "edit") {
      return;
    }

    const hasCurrentProfile = availableProfiles.some(
      (option) => option.value === values.profile,
    );

    if (!hasCurrentProfile && availableProfiles.length > 0) {
      setValues((current) => ({
        ...current,
        profile: availableProfiles[0].value,
      }));
    }
  }, [availableProfiles, mode, values.profile]);

  const handleTargetChange = (nextTarget: ExportTarget) => {
    const nextDeliveryOptions = getDeliveryFormatOptionsForTarget(
      nextTarget,
      capabilities,
    );
    const nextDelivery = nextDeliveryOptions[0]?.value ?? "Json";
    const nextProfileOptions = getProfileOptionsForSelection(
      nextTarget,
      nextDelivery,
      capabilities,
    );
    const nextProfile = nextProfileOptions[0]?.value ?? "Native";

    setValues((current) => ({
      ...current,
      exportTarget: nextTarget,
      deliveryFormat: nextDelivery,
      profile: nextProfile,
      keySeparator: getDefaultExportKeySeparator(nextTarget, nextProfile),
    }));
  };

  const handleDeliveryChange = (nextDelivery: ExportDeliveryFormat) => {
    const nextProfileOptions = getProfileOptionsForSelection(
      values.exportTarget,
      nextDelivery,
      capabilities,
    );
    const nextProfile = nextProfileOptions[0]?.value ?? "Native";

    setValues((current) => ({
      ...current,
      deliveryFormat: nextDelivery,
      profile: nextProfile,
      keySeparator: getDefaultExportKeySeparator(
        current.exportTarget,
        nextProfile,
      ),
    }));
  };

  const handleProfileChange = (nextProfile: ExportProfile) => {
    setValues((current) => ({
      ...current,
      profile: nextProfile,
      keySeparator: getDefaultExportKeySeparator(
        current.exportTarget,
        nextProfile,
      ),
    }));
  };

  const isEdit = mode === "edit";

  return (
    <>
      {isEdit && initialFormat ? (
        <Alert variant="info">
          <AlertDescription>
            {getExportFormatTypeLabel(initialFormat)}. Export type cannot be
            changed after creation.
          </AlertDescription>
        </Alert>
      ) : null}

      <input type="hidden" name="exportTarget" value={values.exportTarget} />
      <input
        type="hidden"
        name="deliveryFormat"
        value={values.deliveryFormat}
      />
      <input type="hidden" name="profile" value={values.profile} />
      <input type="hidden" name="aliasProfile" value={values.aliasProfile} />

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor={`${mode}-name`}>Name</Label>
          <Input
            id={`${mode}-name`}
            name="name"
            required
            maxLength={200}
            value={values.name}
            onChange={(event) =>
              setValues((current) => ({ ...current, name: event.target.value }))
            }
          />
          <FieldError message={fieldErrors?.name?.[0]} />
        </div>

        {!isEdit ? (
          <>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`${mode}-exportTarget`}>Export target</Label>
              <Select
                value={values.exportTarget}
                onValueChange={(value) =>
                  handleTargetChange(value as ExportTarget)
                }
              >
                <SelectTrigger id={`${mode}-exportTarget`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPORT_TARGET_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor={`${mode}-deliveryFormat`}>Delivery format</Label>
              <Select
                value={values.deliveryFormat}
                onValueChange={(value) =>
                  handleDeliveryChange(value as ExportDeliveryFormat)
                }
                disabled={availableDeliveryFormats.length === 0}
              >
                <SelectTrigger id={`${mode}-deliveryFormat`}>
                  <SelectValue placeholder="Select delivery format" />
                </SelectTrigger>
                <SelectContent>
                  {availableDeliveryFormats.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {visibility.variant ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${mode}-profile`}>Variant</Label>
                <Select
                  value={values.profile}
                  onValueChange={(value) =>
                    handleProfileChange(value as ExportProfile)
                  }
                  disabled={availableProfiles.length === 0}
                >
                  <SelectTrigger id={`${mode}-profile`}>
                    <SelectValue placeholder="Select variant">
                      {
                        availableProfiles.find(
                          (option) => option.value === values.profile,
                        )?.label
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
                {selectedProfileCapability?.description ? (
                  <p className="text-sm text-muted-foreground">
                    {selectedProfileCapability.description}
                  </p>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}

        {visibility.includeTestSubmissions ? (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`${mode}-includeTestSubmissions`}
              name="includeTestSubmissions"
              value="true"
              checked={values.includeTestSubmissions}
              onCheckedChange={(checked) =>
                setValues((current) => ({
                  ...current,
                  includeTestSubmissions: checked === true,
                }))
              }
            />
            <Label htmlFor={`${mode}-includeTestSubmissions`}>
              Include test submissions by default
            </Label>
          </div>
        ) : null}

        {isEdit ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${mode}-description`}>Description</Label>
            <Input
              id={`${mode}-description`}
              name="description"
              maxLength={500}
              value={values.description}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </div>
        ) : null}

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="advanced" className="border-b-0">
            <AccordionTrigger className="py-3 hover:no-underline">
              <span className="flex flex-col items-start gap-1 text-left">
                <span>Advanced</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Column naming for submission headers, plus the key separator
                  used when joining nested keys in submissions and codebook
                  exports.
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`${mode}-aliasProfile`}>Column naming</Label>
                <p className="text-sm text-muted-foreground">
                  Naming convention applied to submission export headers.
                </p>
                <Select
                  value={values.aliasProfile}
                  onValueChange={(value) =>
                    setValues((current) => ({
                      ...current,
                      aliasProfile: value as ColumnAliasProfile,
                    }))
                  }
                >
                  <SelectTrigger id={`${mode}-aliasProfile`} className="w-full">
                    <SelectValue placeholder="Select naming convention">
                      {selectedNamingConvention?.label}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {namingConventions.map((option) => (
                      <SelectItem
                        key={option.wireKey}
                        value={option.wireKey}
                        className="items-start py-2"
                      >
                        <span className="flex flex-col gap-0.5 whitespace-normal">
                          <span>{option.label}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {option.description}
                          </span>
                          {option.example ? (
                            <span className="font-mono text-xs font-normal text-muted-foreground">
                              e.g. {option.example}
                            </span>
                          ) : null}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedNamingConvention ? (
                  <p className="text-sm text-muted-foreground">
                    {selectedNamingConvention.description}
                    {selectedNamingConvention.example ? (
                      <>
                        {" "}
                        Example: <code>{selectedNamingConvention.example}</code>
                      </>
                    ) : null}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor={`${mode}-keySeparator`}>Key separator</Label>
                <p className="text-sm text-muted-foreground">
                  Joins nested question keys, for example{" "}
                  <code>question__choice</code>.
                </p>
                <Input
                  id={`${mode}-keySeparator`}
                  name="keySeparator"
                  value={values.keySeparator}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      keySeparator: event.target.value,
                    }))
                  }
                />
                <FieldError message={fieldErrors?.keySeparator?.[0]} />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </>
  );
}
