import type { DataList } from "@/lib/endatix-api/data-lists/types";
import type { SurveyCreatorModel } from "survey-creator-core";
import {
  FormDiagnosticsPlugin,
  FORM_DIAGNOSTICS_PLUGIN_NAME,
} from "./form-diagnostics-plugin";

export interface FormDiagnosticsContext {
  isPublic?: boolean;
  formId?: string;
  formName?: string;
  formIsEnabled?: boolean;
  availableDataListNames?: string[];
}

export interface FormDiagnosticsContextInput {
  isPublic?: boolean;
  formId?: string;
  formName?: string;
  formIsEnabled?: boolean;
  dataLists?: DataList[] | null;
}

export function createFormDiagnosticsContext(
  input: FormDiagnosticsContextInput,
): FormDiagnosticsContext {
  return {
    isPublic: input.isPublic,
    formId: input.formId,
    formName: input.formName,
    formIsEnabled: input.formIsEnabled,
    availableDataListNames: (input.dataLists ?? []).map(
      (dataList) => dataList.name,
    ),
  };
}

export function getFormDiagnosticsPlugin(
  creator: SurveyCreatorModel,
): FormDiagnosticsPlugin | undefined {
  const tab = creator.tabs?.find(
    (t: { id?: string; name?: string }) =>
      t.id === FORM_DIAGNOSTICS_PLUGIN_NAME ||
      t.name === FORM_DIAGNOSTICS_PLUGIN_NAME,
  );
  const plugin = tab?.plugin;
  return plugin instanceof FormDiagnosticsPlugin ? plugin : undefined;
}

export function applyFormDiagnosticsContext(
  creator: SurveyCreatorModel,
  context: FormDiagnosticsContext,
): void {
  const plugin = getFormDiagnosticsPlugin(creator);
  if (!plugin) {
    return;
  }

  plugin.isPublic = context.isPublic;
  plugin.formId = context.formId;
  plugin.formName = context.formName;
  plugin.formIsEnabled = context.formIsEnabled;
  plugin.availableDataListNames = context.availableDataListNames ?? [];
}
