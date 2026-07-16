"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ColumnAliasNamingConventionDto,
  ExportCapabilityDto,
  ExportDeliveryFormat,
  ExportFormatListItem,
  ExportProfile,
  ExportTarget,
} from "@/lib/endatix-api/reporting/export-format-types";
import {
  getColumnAliasNamingConvention,
  getDefaultExportFormatSelection,
  getDefaultExportKeySeparator,
  getDeliveryFormatOptionsForTarget,
  getExportCapabilityForSelection,
  getExportFormatSettingsFieldVisibility,
  getExportTargetOptions,
  getProfileOptionsForSelection,
} from "@/lib/endatix-api/reporting/export-format-types";

export interface ExportFormatFormValues {
  name: string;
  description: string;
  exportTarget: ExportTarget | "";
  deliveryFormat: ExportDeliveryFormat | "";
  profile: ExportProfile | "";
  aliasProfile: string;
  keySeparator: string;
  includeTestSubmissions: boolean;
}

export type ExportFormatFormMode = "create" | "edit";

function getInitialValues(
  mode: ExportFormatFormMode,
  capabilities: ExportCapabilityDto[],
  namingConventions: ColumnAliasNamingConventionDto[],
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

  const catalogDefault = getDefaultExportFormatSelection(capabilities);
  const exportTarget =
    defaultValues?.exportTarget || catalogDefault?.exportTarget || "";
  const deliveryFormat =
    defaultValues?.deliveryFormat || catalogDefault?.deliveryFormat || "";
  const profile = defaultValues?.profile || catalogDefault?.profile || "";
  const aliasProfile =
    defaultValues?.aliasProfile || namingConventions[0]?.wireKey || "";
  const keySeparator =
    defaultValues?.keySeparator ||
    (profile ? getDefaultExportKeySeparator(profile) : "");

  return {
    name: defaultValues?.name ?? "",
    description: defaultValues?.description ?? "",
    exportTarget,
    deliveryFormat,
    profile,
    aliasProfile,
    keySeparator,
    includeTestSubmissions: defaultValues?.includeTestSubmissions ?? false,
  };
}

interface UseExportFormatFormStateArgs {
  capabilities: ExportCapabilityDto[];
  namingConventions: ColumnAliasNamingConventionDto[];
  mode: ExportFormatFormMode;
  initialFormat?: ExportFormatListItem;
  defaultValues?: Partial<ExportFormatFormValues>;
  fieldErrors?: Record<string, string[] | undefined>;
}

export function useExportFormatFormState({
  capabilities,
  namingConventions,
  mode,
  initialFormat,
  defaultValues,
  fieldErrors,
}: UseExportFormatFormStateArgs) {
  const [values, setValues] = useState<ExportFormatFormValues>(() =>
    getInitialValues(
      mode,
      capabilities,
      namingConventions,
      initialFormat,
      defaultValues,
    ),
  );

  const availableTargets = useMemo(
    () => getExportTargetOptions(capabilities),
    [capabilities],
  );

  const availableDeliveryFormats = useMemo(
    () =>
      values.exportTarget
        ? getDeliveryFormatOptionsForTarget(values.exportTarget, capabilities)
        : [],
    [capabilities, values.exportTarget],
  );

  const availableProfiles = useMemo(
    () =>
      values.exportTarget && values.deliveryFormat
        ? getProfileOptionsForSelection(
            values.exportTarget,
            values.deliveryFormat,
            capabilities,
          )
        : [],
    [capabilities, values.deliveryFormat, values.exportTarget],
  );

  const selectedNamingConvention = useMemo(
    () =>
      getColumnAliasNamingConvention(values.aliasProfile, namingConventions),
    [namingConventions, values.aliasProfile],
  );

  const selectedProfileCapability = useMemo(
    () =>
      values.exportTarget && values.deliveryFormat && values.profile
        ? getExportCapabilityForSelection(
            values.exportTarget,
            values.deliveryFormat,
            values.profile,
            capabilities,
          )
        : undefined,
    [capabilities, values.deliveryFormat, values.exportTarget, values.profile],
  );

  const visibility = values.exportTarget
    ? getExportFormatSettingsFieldVisibility(values.exportTarget)
    : { includeTestSubmissions: false, variant: false };
  const isEdit = mode === "edit";

  // Keep create-mode selects aligned with the capability catalog when options change.
  useEffect(() => {
    if (isEdit) {
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
  }, [availableDeliveryFormats, isEdit, values.deliveryFormat]);

  useEffect(() => {
    if (isEdit) {
      return;
    }

    const hasCurrentProfile = availableProfiles.some(
      (option) => option.value === values.profile,
    );

    if (!hasCurrentProfile && availableProfiles.length > 0) {
      setValues((current) => ({
        ...current,
        profile: availableProfiles[0].value,
        keySeparator: getDefaultExportKeySeparator(availableProfiles[0].value),
      }));
    }
  }, [availableProfiles, isEdit, values.profile]);

  const hasAdvancedErrors = Boolean(
    fieldErrors?.keySeparator?.length || fieldErrors?.aliasProfile?.length,
  );
  const [advancedSection, setAdvancedSection] = useState<string | undefined>(
    hasAdvancedErrors ? "advanced" : undefined,
  );

  useEffect(() => {
    if (hasAdvancedErrors) {
      setAdvancedSection("advanced");
    }
  }, [hasAdvancedErrors]);

  const handleTargetChange = (nextTarget: ExportTarget) => {
    const nextDelivery = getDeliveryFormatOptionsForTarget(
      nextTarget,
      capabilities,
    )[0]?.value;
    if (!nextDelivery) {
      return;
    }

    const nextProfile = getProfileOptionsForSelection(
      nextTarget,
      nextDelivery,
      capabilities,
    )[0]?.value;
    if (!nextProfile) {
      return;
    }

    setValues((current) => ({
      ...current,
      exportTarget: nextTarget,
      deliveryFormat: nextDelivery,
      profile: nextProfile,
      keySeparator: getDefaultExportKeySeparator(nextProfile),
    }));
  };

  const handleDeliveryChange = (nextDelivery: ExportDeliveryFormat) => {
    if (!values.exportTarget) {
      return;
    }

    const nextProfile = getProfileOptionsForSelection(
      values.exportTarget,
      nextDelivery,
      capabilities,
    )[0]?.value;
    if (!nextProfile) {
      return;
    }

    setValues((current) => ({
      ...current,
      deliveryFormat: nextDelivery,
      profile: nextProfile,
      keySeparator: getDefaultExportKeySeparator(nextProfile),
    }));
  };

  const handleProfileChange = (nextProfile: ExportProfile) => {
    setValues((current) => ({
      ...current,
      profile: nextProfile,
      keySeparator: getDefaultExportKeySeparator(nextProfile),
    }));
  };

  return {
    values,
    setValues,
    isEdit,
    visibility,
    availableTargets,
    availableDeliveryFormats,
    availableProfiles,
    selectedNamingConvention,
    selectedProfileCapability,
    advancedSection,
    setAdvancedSection,
    handleTargetChange,
    handleDeliveryChange,
    handleProfileChange,
  };
}
