import type { SurveyCreatorModel } from "survey-creator-core";
import type { AudienceFinding } from "@/lib/personalization/authoring";
import { FORM_DIAGNOSTICS_PLUGIN_NAME } from "./constants";
import { FormDiagnosticsPlugin } from "./form-diagnostics-plugin";

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

/** The form's Audience variables as Diagnostics reads them: the designer's Audience binding. */
export interface DiagnosticsAudience {
  review(): Promise<{ findings: AudienceFinding[] }>;
  applyFix(finding: AudienceFinding): void;
  refresh(): Promise<void>;
}

/**
 * Shows the form's Audience findings in Diagnostics; `undefined` removes them. A closed tab reviews
 * on `activate`, so binding at Creator init neither lints the not-yet-loaded form nor loads the linter.
 */
export function applyFormDiagnosticsAudience(
  creator: SurveyCreatorModel,
  audience: DiagnosticsAudience | undefined,
): void {
  const plugin = getFormDiagnosticsPlugin(creator);
  if (!plugin) return;
  plugin.audience = audience;
  if (audience && creator.activeTab !== FORM_DIAGNOSTICS_PLUGIN_NAME) return;
  void plugin.updateAudienceFindings();
}
