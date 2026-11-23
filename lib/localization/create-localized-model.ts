import { Model } from "survey-core";
import { loadSurveyLocalePacks } from "./survey-locale-packs";

/** Use SurveyJS's own localizable properties, including registered custom questions. */
export async function createLocalizedModel(
  definition: string | object,
): Promise<Model> {
  const { locale, ...content } =
    typeof definition === "string" ? JSON.parse(definition) : definition;
  const model = new Model(content);
  const languages = new Set<string>(model.getUsedLocales());
  if (typeof locale === "string") languages.add(locale);
  await loadSurveyLocalePacks(languages);
  if (typeof locale === "string") model.locale = locale;
  return model;
}
