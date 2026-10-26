import { Base, SvgRegistry, type SurveyModel } from "survey-core";
import {
  ICreatorPlugin,
  SurveyCreatorModel,
  SurveyLogic,
} from "survey-creator-core";
import { TelemetryLogger } from "@/features/telemetry";
import type { AudienceFinding } from "@/lib/personalization/authoring";
import type { DiagnosticsAudience } from "./form-diagnostics-context";
import {
  analyzeSurvey,
  analyzeSurveyModel,
  FormDiagnosticsStats,
} from "./form-diagnostics-logic";

const LOGGER_NAME = "form-diagnostics.audience";

/** One empty list, so a snapshot read before the first review stays the same reference. */
const NO_FINDINGS: AudienceFinding[] = [];

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

  /** Set by the designer when the form has Audience variables (personalization). */
  public audience: DiagnosticsAudience | undefined;

  /** Warnings only: nothing here blocks a save. */
  public get audienceFindings(): AudienceFinding[] {
    return this.getPropertyValue("audienceFindings") ?? NO_FINDINGS;
  }

  public set audienceFindings(val: AudienceFinding[]) {
    this.setPropertyValue("audienceFindings", val);
  }

  public applyAudienceFix(finding: AudienceFinding): Promise<void> {
    this.audience?.applyFix(finding);
    return this.updateAudienceFindings();
  }

  public async addAudienceProperty(finding: AudienceFinding): Promise<void> {
    await this.audience?.addProperty(finding);
    return this.updateAudienceFindings();
  }

  private latestReview = 0;

  /**
   * Only the latest review lands. A failing review shows nothing: warnings never stand in the way
   * of the designer.
   */
  public async updateAudienceFindings(): Promise<void> {
    const review = ++this.latestReview;
    let findings: AudienceFinding[] = [];
    try {
      findings = (await this.audience?.review())?.findings ?? [];
    } catch (error) {
      TelemetryLogger.error("Audience review failed.", error, {}, LOGGER_NAME);
    }
    if (review === this.latestReview) this.audienceFindings = findings;
  }

  /** The survey `update()` analyzed last: a call that brings no new one is skipped. */
  private analyzedSurvey: SurveyModel | undefined;

  public updateStats() {
    this.analyze();
    void this.updateAudienceFindings();
  }

  private analyze() {
    if (!this.creator) return;
    this.analyzedSurvey = this.creator.survey;

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

  /**
   * Reviews once, after reading the variables again: a Property added in the Audience tab since the
   * designer opened. Until then the tab keeps the findings it showed last.
   */
  public activate() {
    if (!this.audience) {
      this.updateStats();
      return;
    }
    this.analyze();
    void this.audience
      .refresh()
      .catch((error: unknown) => {
        TelemetryLogger.error(
          "Audience refresh failed.",
          error,
          {},
          LOGGER_NAME,
        );
      })
      .then(() => this.updateAudienceFindings());
  }

  /**
   * The Creator calls this on the active tab once a new survey is in place, as when it loads the
   * saved form after a `?tab=` deep link has opened this tab (`onDesignerSurveyCreated` is earlier,
   * while `creator.JSON` still reads the old survey). The Creator calls it twice per load, since
   * `updatePlugin("designer")` updates the active tab too, and again on `applyTheme`: only a new
   * survey is analyzed.
   */
  public update() {
    if (this.creator?.survey === this.analyzedSurvey) return;
    this.updateStats();
  }

  public deactivate(): boolean {
    return true;
  }
}

const diagnosticsIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/></svg>';
SvgRegistry.registerIcon("icon-tab-form-diagnostics", diagnosticsIcon);
