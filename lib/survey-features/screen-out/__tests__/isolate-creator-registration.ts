import { getLocaleStrings, SurveyLogic } from "survey-creator-core";

export function isolateCreatorRegistration() {
  const strings = getLocaleStrings("en");
  const triggers = strings.triggers;
  const logicLabels = strings.ed.lg;
  const types = SurveyLogic.types;

  strings.triggers = { ...triggers };
  strings.ed.lg = { ...logicLabels };
  // Registration also replaces incorrectClasses on the parent Complete action.
  const originalTypes = types.splice(
    0,
    types.length,
    ...types.map((type) => ({ ...type })),
  );

  return () => {
    strings.triggers = triggers;
    strings.ed.lg = logicLabels;
    types.splice(0, types.length, ...originalTypes);
  };
}
