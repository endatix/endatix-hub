import { surveyLocalization } from "survey-core";
import { expect, it } from "vitest";
import { createLocalizedModel } from "../create-localized-model";

it("registers the definition language and translated question language only", async () => {
  // Arrange
  const before = Object.keys(surveyLocalization.locales);
  const definition = {
    locale: "de",
    elements: [{ type: "text", name: "name", title: { "pt-br": "Nome" } }],
  };

  // Act
  const model = await createLocalizedModel(definition);
  const initialNext = model.pageNextText;
  model.locale = "pt-br";

  // Assert
  expect(initialNext).toBe("Weiter");
  expect(model.pageNextText).toBe("Próximo");
  expect(
    Object.keys(surveyLocalization.locales)
      .filter((key) => !before.includes(key))
      .sort(),
  ).toEqual(["de", "pt-br"]);
});

it.each(["en", "zz"])(
  "renders %s with built-in English and no additional pack",
  async (locale) => {
    // Arrange
    const before = Object.keys(surveyLocalization.locales);

    // Act
    const model = await createLocalizedModel({
      locale,
      elements: [{ type: "text", name: "q" }],
    });

    // Assert
    expect(model.pageNextText).toBe("Next");
    expect(Object.keys(surveyLocalization.locales)).toEqual(before);
  },
);
