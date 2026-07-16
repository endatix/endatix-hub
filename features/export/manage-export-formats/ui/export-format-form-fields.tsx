"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  ColumnAliasNamingConventionDto,
  ExportCapabilityDto,
  ExportFormatListItem,
} from "@/lib/endatix-api/reporting/export-format-types";
import { getExportFormatTypeLabel } from "@/lib/endatix-api/reporting/export-format-types";
import { ExportFormatAdvancedFields } from "./export-format-advanced-fields";
import { ExportFormatTypeFields } from "./export-format-type-fields";
import {
  useExportFormatFormState,
  type ExportFormatFormMode,
  type ExportFormatFormValues,
} from "./use-export-format-form-state.hook";

export type { ExportFormatFormValues };

interface ExportFormatFormFieldsProps {
  capabilities: ExportCapabilityDto[];
  namingConventions: ColumnAliasNamingConventionDto[];
  mode: ExportFormatFormMode;
  initialFormat?: ExportFormatListItem;
  fieldErrors?: Record<string, string[] | undefined>;
  defaultValues?: Partial<ExportFormatFormValues>;
}

function FieldError({ message }: Readonly<{ message?: string }>) {
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
}: Readonly<ExportFormatFormFieldsProps>) {
  const {
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
  } = useExportFormatFormState({
    capabilities,
    namingConventions,
    mode,
    initialFormat,
    defaultValues,
    fieldErrors,
  });

  return (
    <>
      {isEdit && initialFormat ? (
        <Alert variant="info">
          <AlertDescription>
            {getExportFormatTypeLabel(initialFormat, capabilities)}. Export type
            cannot be changed after creation.
          </AlertDescription>
        </Alert>
      ) : null}

      {!isEdit && availableTargets.length === 0 ? (
        <Alert variant="destructive">
          <AlertDescription>
            No export capabilities are available from the API. Refresh the page
            or contact support if this persists.
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
      <input type="hidden" name="keySeparator" value={values.keySeparator} />

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
          <ExportFormatTypeFields
            mode={mode}
            exportTarget={values.exportTarget}
            deliveryFormat={values.deliveryFormat}
            profile={values.profile}
            showVariant={visibility.variant}
            availableTargets={availableTargets}
            availableDeliveryFormats={availableDeliveryFormats}
            availableProfiles={availableProfiles}
            selectedProfileDescription={selectedProfileCapability?.description}
            onTargetChange={handleTargetChange}
            onDeliveryChange={handleDeliveryChange}
            onProfileChange={handleProfileChange}
          />
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

        <ExportFormatAdvancedFields
          mode={mode}
          aliasProfile={values.aliasProfile}
          keySeparator={values.keySeparator}
          namingConventions={namingConventions}
          selectedNamingConvention={selectedNamingConvention}
          keySeparatorError={fieldErrors?.keySeparator?.[0]}
          accordionValue={advancedSection}
          onAccordionValueChange={setAdvancedSection}
          onAliasProfileChange={(aliasProfile) =>
            setValues((current) => ({ ...current, aliasProfile }))
          }
          onKeySeparatorChange={(keySeparator) =>
            setValues((current) => ({ ...current, keySeparator }))
          }
        />
      </div>
    </>
  );
}
