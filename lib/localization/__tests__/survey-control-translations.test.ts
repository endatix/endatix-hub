import { surveyLocalization } from "survey-core";
import { expect, it } from "vitest";
import { createLocalizedModel } from "../create-localized-model";

// Next-button labels from the individual SurveyJS packs. Some regional packs
// share this label with their base, so also check the exact code registered.
const nextLabels = {
  ar: "التالي",
  bg: "Напред",
  ca: "Següent",
  cs: "Další",
  cy: "Nesaf",
  da: "Videre",
  de: "Weiter",
  el: "Επόμενο",
  es: "Siguiente",
  et: "Edasi",
  eu: "Hurrengoa",
  fa: "بعدی",
  fi: "Seuraava",
  fil: "Susunod",
  fr: "Suivant",
  he: "קדימה",
  hi: "अगला",
  hr: "Sljedeći",
  ht: "Pwochen",
  hu: "Tovább",
  id: "Selanjutnya",
  is: "Áfram",
  it: "Successivo",
  ja: "次へ",
  ka: "შემდეგ",
  kk: "Келесі",
  ko: "다음",
  lt: "Toliau",
  lv: "Nākamā lapa",
  mk: "Следно",
  mm: "ရှေ့သို့",
  ms: "Seterusnya",
  nl: "Volgende",
  "nl-BE": "Volgende",
  no: "Neste",
  pl: "Dalej",
  pt: "Próximo",
  "pt-br": "Próximo",
  ro: "Următor",
  ru: "Далее",
  sk: "Ďalej",
  sl: "Naslednja",
  sr: "Dalje",
  sv: "Nästa",
  sw: "Ifuatayo",
  tel: "తరువాయ",
  tg: "Оянда",
  th: "ถัดไป",
  tr: "Sonraki",
  uk: "Далі",
  ur: "اگلا",
  vi: "Tiếp theo",
  "zh-cn": "下一页",
  "zh-tw": "下一頁",
};

it.each(Object.entries(nextLabels))(
  "renders the %s navigation controls",
  async (locale, next) => {
    // Arrange
    const before = new Set(Object.keys(surveyLocalization.locales));

    // Act
    const model = await createLocalizedModel({ locale });

    // Assert
    expect(model.pageNextText).toBe(next);
    expect(
      Object.keys(surveyLocalization.locales).filter((key) => !before.has(key)),
    ).toEqual([locale]);
  },
);
