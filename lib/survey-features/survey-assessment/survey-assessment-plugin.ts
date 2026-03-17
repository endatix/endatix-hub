import { Base, SvgRegistry } from "survey-core";
import { ICreatorPlugin, SurveyCreatorModel, SurveyLogic } from "survey-creator-core";
import { analyzeSurvey, SurveyStats } from "./survey-assessment-logic";

export const ASSESSMENT_PLUGIN_NAME = "assessment";

/**
 * Survey Creator plugin for the Survey Assessment feature.
 * Extends Base to provide reactive properties directly.
 */
export class SurveyAssessmentPlugin extends Base implements ICreatorPlugin {
  constructor(private creator: SurveyCreatorModel) {
    super();
    this.updateStats();
  }

  /**
   * The model for the tab component. In this case, the plugin itself.
   */
  public get model(): SurveyAssessmentPlugin {
    return this;
  }

  public get stats(): SurveyStats {
    return this.getPropertyValue("stats");
  }

  public set stats(val: SurveyStats) {
    this.setPropertyValue("stats", val);
  }

  public get requiresReCaptcha(): boolean {
    return this.getPropertyValue("requiresReCaptcha", false);
  }

  public set requiresReCaptcha(val: boolean) {
    this.setPropertyValue("requiresReCaptcha", val);
  }

  public updateStats() {
    if (!this.creator) return;

    const baseStats = analyzeSurvey(this.creator.text || "");

    const survey = this.creator.survey;
    if (survey) {
      const logic = new SurveyLogic(survey, this.creator);
      logic.update();
      this.stats = {
        ...baseStats,
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
   * Called when the tab is activated.
   */
  public activate() {
    this.updateStats();
  }

  /**
   * Called when the tab is deactivated.
   * @returns true to allow deactivation.
   */
  public deactivate(): boolean {
    return true;
  }
}

// Register Icon for the tab
const assessmentIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/></svg>';
SvgRegistry.registerIcon("icon-tab-assessment", assessmentIcon);