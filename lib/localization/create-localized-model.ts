import { Model } from "survey-core";
import { loadSurveyLocalePack } from "./survey-locale-packs";

/** Use SurveyJS's own localizable properties, including registered custom questions. */
export async function createLocalizedModel(
  definition: string | object,
): Promise<Model> {
  const { locale, ...content } =
    typeof definition === "string" ? JSON.parse(definition) : definition;
  const model = new Model(content);
  const languages = new Set<string>(model.getUsedLocales());
  if (typeof locale === "string") languages.add(locale);
  await Promise.all(Array.from(languages, loadSurveyLocalePack));
  if (typeof locale === "string") model.locale = locale;
  return model;
}
