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
  folderId?: string | null;
  availableDataListNames?: string[];
}

export interface FormDiagnosticsContextInput {
  isPublic?: boolean;
  formId?: string;
  formName?: string;
  formIsEnabled?: boolean;
  folderId?: string | null;
  availableDataListNames?: string[];
}

/** Form metadata carried on designer runtime. */
export type FormDiagnosticsRuntimeSlice = Omit<
  FormDiagnosticsContextInput,
  "availableDataListNames"
>;

export function createFormDiagnosticsContextFromRuntime(
  runtime: FormDiagnosticsRuntimeSlice,
): FormDiagnosticsContext {
  return createFormDiagnosticsContext(runtime);
}

export function createFormDiagnosticsContext(
  input: FormDiagnosticsContextInput,
): FormDiagnosticsContext {
  return {
    isPublic: input.isPublic,
    formId: input.formId,
    formName: input.formName,
    formIsEnabled: input.formIsEnabled,
    folderId: input.folderId,
    availableDataListNames: input.availableDataListNames ?? [],
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
  plugin.folderId = context.folderId;
  plugin.availableDataListNames = context.availableDataListNames ?? [];
}
