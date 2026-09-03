import { Base, SvgRegistry } from "survey-core";
import {
  ICreatorPlugin,
  SurveyCreatorModel,
  SurveyLogic,
} from "survey-creator-core";
import {
  analyzeSurvey,
  analyzeSurveyModel,
  FormDiagnosticsStats,
} from "./form-diagnostics-logic";

/**
 * Survey Creator plugin for the Form Diagnostics feature.
 * Extends Base to provide reactive properties directly.
 */
export class FormDiagnosticsPlugin extends Base implements ICreatorPlugin {
  constructor(public readonly creator: SurveyCreatorModel) {
    super();
    this.updateStats();
  }

  public get model(): this {
    return this;
  }

  public get stats(): FormDiagnosticsStats {
    return this.getPropertyValue("stats");
  }

  public set stats(val: FormDiagnosticsStats) {
    this.setPropertyValue("stats", val);
  }

  public get requiresReCaptcha(): boolean {
    return this.getPropertyValue("requiresReCaptcha", false);
  }

  public set requiresReCaptcha(val: boolean) {
    this.setPropertyValue("requiresReCaptcha", val);
  }

  /** Whether the form is public (anyone with link) or private (authenticated only). Set by the form editor when form context is available. */
  public get isPublic(): boolean | undefined {
    return this.getPropertyValue("isPublic");
  }

  public set isPublic(val: boolean | undefined) {
    this.setPropertyValue("isPublic", val);
  }

  public get formId(): string | undefined {
    return this.getPropertyValue("formId");
  }

  public set formId(val: string | undefined) {
    this.setPropertyValue("formId", val);
  }

  public get formName(): string | undefined {
    return this.getPropertyValue("formName");
  }

  public set formName(val: string | undefined) {
    this.setPropertyValue("formName", val);
  }

  public get formIsEnabled(): boolean | undefined {
    return this.getPropertyValue("formIsEnabled");
  }

  public set formIsEnabled(val: boolean | undefined) {
    this.setPropertyValue("formIsEnabled", val);
  }

  /** Folder of the form being edited; used when creating a copied form from diagnostics. */
  public get folderId(): string | null | undefined {
    return this.getPropertyValue("folderId");
  }

  public set folderId(val: string | null | undefined) {
    this.setPropertyValue("folderId", val);
  }

  public get availableDataListNames(): string[] {
    return this.getPropertyValue("availableDataListNames") ?? [];
  }

  public set availableDataListNames(val: string[]) {
    this.setPropertyValue("availableDataListNames", val);
  }

  public updateStats() {
    if (!this.creator) return;

    const baseStats = analyzeSurvey(this.creator.text || "");

    const survey = this.creator.survey;
    if (survey) {
      const modelStats = analyzeSurveyModel(survey);
      const logic = new SurveyLogic(survey, this.creator);
      logic.update();
      this.stats = {
        ...baseStats,
        ...modelStats,
        logicConditionsCount: logic.items.length + logic.invisibleItems.length,
        invisibleLogicItemsCount: logic.invisibleItems.length,
      };
      logic.dispose();
    } else {
      this.stats = baseStats;
    }

    this.requiresReCaptcha =
      (this.creator.survey as any)?.requiresReCaptcha === true;
  }

  public activate() {
    this.updateStats();
  }

  public deactivate(): boolean {
    return true;
  }
}

const diagnosticsIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/></svg>';
SvgRegistry.registerIcon("icon-tab-form-diagnostics", diagnosticsIcon);
