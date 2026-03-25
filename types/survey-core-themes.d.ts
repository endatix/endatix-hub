declare module "survey-core/themes" {
  /**
   * SurveyJS theme exports are used as plain theme objects in the app.
   * The SurveyJS package may not ship TS declarations for this subpath,
   * so we provide minimal typings to unblock the Next.js build.
   */
  export const DefaultLight: any;
  export const BorderlessLight: any;
  export const BorderlessLightPanelless: any;
  export const SharpLightPanelless: any;
}
