// Literal imports let the production bundler split each SurveyJS pack. English is built in.
const packs = new Map<string, () => Promise<unknown>>([
  ["ar", () => import("survey-core/i18n/arabic")],
  ["bg", () => import("survey-core/i18n/bulgarian")],
  ["ca", () => import("survey-core/i18n/catalan")],
  ["cs", () => import("survey-core/i18n/czech")],
  ["cy", () => import("survey-core/i18n/welsh")],
  ["da", () => import("survey-core/i18n/danish")],
  ["de", () => import("survey-core/i18n/german")],
  ["el", () => import("survey-core/i18n/greek")],
  ["es", () => import("survey-core/i18n/spanish")],
  ["et", () => import("survey-core/i18n/estonian")],
  ["eu", () => import("survey-core/i18n/basque")],
  ["fa", () => import("survey-core/i18n/persian")],
  ["fi", () => import("survey-core/i18n/finnish")],
  ["fil", () => import("survey-core/i18n/philippines")],
  ["fr", () => import("survey-core/i18n/french")],
  ["he", () => import("survey-core/i18n/hebrew")],
  ["hi", () => import("survey-core/i18n/hindi")],
  ["hr", () => import("survey-core/i18n/croatian")],
  ["ht", () => import("survey-core/i18n/haitian-creole")],
  ["hu", () => import("survey-core/i18n/hungarian")],
  ["id", () => import("survey-core/i18n/indonesian")],
  ["is", () => import("survey-core/i18n/icelandic")],
  ["it", () => import("survey-core/i18n/italian")],
  ["ja", () => import("survey-core/i18n/japanese")],
  ["ka", () => import("survey-core/i18n/georgian")],
  ["kk", () => import("survey-core/i18n/kazakh")],
  ["ko", () => import("survey-core/i18n/korean")],
  ["lt", () => import("survey-core/i18n/lithuanian")],
  ["lv", () => import("survey-core/i18n/latvian")],
  ["mk", () => import("survey-core/i18n/macedonian")],
  ["mm", () => import("survey-core/i18n/burmese")],
  ["ms", () => import("survey-core/i18n/malay")],
  ["nl", () => import("survey-core/i18n/dutch")],
  ["nl-be", () => import("survey-core/i18n/nl-BE")],
  ["no", () => import("survey-core/i18n/norwegian")],
  ["pl", () => import("survey-core/i18n/polish")],
  ["pt", () => import("survey-core/i18n/portuguese")],
  ["pt-br", () => import("survey-core/i18n/portuguese-br")],
  ["ro", () => import("survey-core/i18n/romanian")],
  ["ru", () => import("survey-core/i18n/russian")],
  ["sk", () => import("survey-core/i18n/slovak")],
  ["sl", () => import("survey-core/i18n/slovenian")],
  ["sr", () => import("survey-core/i18n/serbian")],
  ["sv", () => import("survey-core/i18n/swedish")],
  ["sw", () => import("survey-core/i18n/swahili")],
  ["tel", () => import("survey-core/i18n/telugu")],
  ["tg", () => import("survey-core/i18n/tajik")],
  ["th", () => import("survey-core/i18n/thai")],
  ["tr", () => import("survey-core/i18n/turkish")],
  ["uk", () => import("survey-core/i18n/ukrainian")],
  ["ur", () => import("survey-core/i18n/urdu")],
  ["vi", () => import("survey-core/i18n/vietnamese")],
  ["zh-cn", () => import("survey-core/i18n/simplified-chinese")],
  ["zh-tw", () => import("survey-core/i18n/traditional-chinese")],
]);

export async function loadSurveyLocalePacks(locales: Iterable<string>) {
  const codes = new Set<string>();
  for (const locale of locales) {
    const tag = locale.toLowerCase();
    codes.add(tag);
    // SurveyJS falls back per string, even when the regional pack exists.
    codes.add(tag.split("-")[0]);
  }
  const pending: Promise<unknown>[] = [];
  for (const code of codes) {
    const load = packs.get(code);
    if (load) pending.push(load());
  }
  await Promise.all(pending);
}
