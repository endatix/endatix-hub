import { describe, expect, it } from "vitest";
import { Model } from "survey-core";
import { obfuscateSurveyJson, obfuscateText } from "../obfuscate-survey-json";

const SUPPORT_FORM = {
  title: "Patient intake",
  description: "Tell us about your health",
  completedHtml: "<h3>Thanks, {firstName}</h3>",
  calculatedValues: [{ name: "isAdult", expression: "{age} >= 18" }],
  triggers: [
    {
      type: "copyvalue",
      expression: "{smoker} = 'yes'",
      fromName: "firstName",
      setToName: "nickname",
    },
  ],
  pages: [
    {
      name: "personalPage",
      title: { default: "About you", de: "Über Sie" },
      elements: [
        {
          type: "text",
          name: "firstName",
          title: "First name",
          placeholder: "Jane",
          isRequired: true,
          requiredErrorText: "Name please",
        },
        { type: "text", name: "nickname", title: "Nickname" },
        {
          type: "text",
          name: "age",
          title: "Age",
          inputType: "number",
          validators: [
            { type: "numeric", minValue: 0, text: "Age must be positive" },
          ],
        },
        { type: "html", name: "intro", html: "<p>Private intro</p>" },
        {
          type: "radiogroup",
          name: "smoker",
          title: "Do you smoke?",
          choices: [
            { value: "yes", text: { default: "Yes, daily", de: "Ja" } },
            { value: "no", text: "Never smoked" },
          ],
          showOtherItem: true,
          otherText: "Something else",
        },
        {
          type: "dropdown",
          name: "brand",
          title: "Which brand?",
          choicesFromQuestion: "smoker",
          visibleIf: "{smoker} = 'yes' and {isAdult}",
        },
        {
          type: "text",
          name: "spouseAge",
          valueName: "partnerAge",
          title: "Partner's age",
        },
        {
          type: "text",
          name: "spouseNote",
          title: "Note for {partnerAge}",
          visibleIf: "{partnerAge} > 40",
        },
      ],
    },
    {
      name: "detailsPage",
      elements: [
        {
          type: "matrix",
          name: "habits",
          title: "Habits",
          columns: [{ value: 1, text: "Rarely" }],
          rows: [{ value: "coffee", text: "Coffee cups" }],
        },
        {
          type: "panel",
          name: "contactPanel",
          title: "Contact details",
          elements: [
            { type: "comment", name: "address", title: "Home address" },
          ],
        },
        {
          type: "rating",
          name: "mood",
          title: "Mood",
          minRateDescription: "Awful",
          maxRateDescription: "Great",
        },
        {
          type: "paneldynamic",
          name: "children",
          title: "Children",
          templateElements: [
            { type: "text", name: "childName", title: "Child name" },
            {
              type: "text",
              name: "childAge",
              title: "Child age",
              visibleIf: "{panel.childName} notempty",
            },
          ],
        },
      ],
    },
  ],
};

const ORIGINAL_TEXTS = [
  "Patient intake",
  "Tell us about your health",
  "About you",
  "Über Sie",
  "First name",
  "Jane",
  "Name please",
  "Age must be positive",
  "Private intro",
  "Do you smoke?",
  "Yes, daily",
  "Never smoked",
  "Something else",
  "Which brand?",
  "Partner's age",
  "Rarely",
  "Coffee cups",
  "Contact details",
  "Home address",
  "Awful",
  "Great",
  "Child name",
];

const ORIGINAL_NAMES = [
  "firstName",
  "nickname",
  "smoker",
  "partnerAge",
  "spouseAge",
  "isAdult",
  "contactPanel",
  "childName",
  "personalPage",
];

function obfuscate(json: object = SUPPORT_FORM) {
  return obfuscateSurveyJson(json, () => 0.5) as any;
}

function questionByTitleKeyOrder(json: any) {
  const survey = new Model(json);
  return survey.getAllQuestions(false, true);
}

describe("obfuscateText", () => {
  it("replaces every letter and keeps case, digits, spaces and punctuation", () => {
    // Arrange
    const randoms = [0, 0.99, 0, 0.99];
    let call = 0;
    const random = () => randoms[call++ % randoms.length];

    // Act
    const scrambled = obfuscateText("Ab 12, cD!", random);

    // Assert
    expect(scrambled).toBe("Az 12, aZ!");
  });

  it("keeps the {placeholders} it pipes", () => {
    // Act
    const scrambled = obfuscateText("Hi {firstName}, see {panel.x}", () => 0);

    // Assert
    expect(scrambled).toBe("Aa {firstName}, aaa {panel.x}");
  });
});

describe("obfuscateSurveyJson", () => {
  it("leaves no original title, description, choice or error text in the file", () => {
    // Act
    const text = JSON.stringify(obfuscate());

    // Assert
    for (const original of ORIGINAL_TEXTS) {
      expect(text).not.toContain(original);
    }
  });

  it("scrambles a text in every locale it has", () => {
    // Act
    const page = obfuscate().pages[0];
    const yes = page.elements.find((e: any) => e.name === "q4").choices[0];

    // Assert
    expect(Object.keys(page.title)).toEqual(["default", "de"]);
    expect(page.title.default).toMatch(/^[A-Z][a-z]{4} [a-z]{3}$/);
    expect(page.title.de).toMatch(/^[A-Z][a-z]{3} [A-Z][a-z]{2}$/);
    expect(Object.keys(yes.text)).toEqual(["default", "de"]);
  });

  it("renames questions q1…qN, panels panel1…panelN and pages page1…pageN", () => {
    // Act
    const result = obfuscate();

    // Assert
    const names = questionByTitleKeyOrder(result).map((q) => q.name);
    expect(names).toEqual([
      "q1",
      "q2",
      "q3",
      "q4",
      "q5",
      "q6",
      "q7",
      "q8",
      "q9",
      "q10",
      "q11",
      "q12",
      "q13",
    ]);
    expect(new Model(result).getAllPanels().map((p) => p.name)).toEqual([
      "panel1",
    ]);
    expect(result.pages.map((p: any) => p.name)).toEqual(["page1", "page2"]);
    const text = JSON.stringify(result);
    for (const original of ORIGINAL_NAMES) {
      expect(text).not.toContain(original);
    }
  });

  it("removes html questions", () => {
    // Act
    const text = JSON.stringify(obfuscate());

    // Assert
    expect(text).not.toContain('"html"');
  });

  it("removes the completed page html, which it cannot scramble safely", () => {
    // Act
    const result = obfuscate();

    // Assert
    expect(result.completedHtml).toBeUndefined();
  });

  it("rewrites {name}, {panel.name}, valueName and calculated value references", () => {
    // Act
    const result = obfuscate();

    // Assert
    const [page1, page2] = result.pages;
    const brand = page1.elements.find((e: any) => e.name === "q5");
    const partner = page1.elements.find((e: any) => e.name === "q6");
    const note = page1.elements.find((e: any) => e.name === "q7");
    const childAge = page2.elements[3].templateElements[1];
    expect(brand.visibleIf).toBe("{q4} = 'yes' and {calc1}");
    expect(result.calculatedValues[0]).toMatchObject({
      name: "calc1",
      expression: "{q3} >= 18",
    });
    expect(partner.valueName).toBe("value1");
    expect(note.visibleIf).toBe("{value1} > 40");
    expect(note.title).toMatch(/\{value1\}$/);
    expect(childAge.visibleIf).toBe("{panel.q12} notempty");
  });

  it("points choicesFromQuestion and trigger names at the renamed questions", () => {
    // Act
    const result = obfuscate();

    // Assert
    const brand = result.pages[0].elements.find((e: any) => e.name === "q5");
    expect(brand.choicesFromQuestion).toBe("q4");
    expect(result.triggers[0]).toMatchObject({
      expression: "{q4} = 'yes'",
      fromName: "q1",
      setToName: "q2",
    });
  });

  it("keeps the logic running in the obfuscated form", () => {
    // Arrange
    const survey = new Model(obfuscate());
    const brand = survey.getQuestionByName("q5");
    const note = survey.getQuestionByName("q7");

    // Act
    survey.setValue("q3", 30);
    survey.setValue("q4", "yes");
    survey.setValue("value1", 41);

    // Assert
    expect(brand.isVisible).toBe(true);
    expect(note.isVisible).toBe(true);
  });

  it("does not change the json it was given", () => {
    // Arrange
    const before = JSON.stringify(SUPPORT_FORM);

    // Act
    obfuscate();

    // Assert
    expect(JSON.stringify(SUPPORT_FORM)).toBe(before);
  });

  it("does not chain renames when a new name equals another old one", () => {
    // Arrange
    const json = {
      pages: [
        {
          elements: [
            { type: "html", name: "q0" },
            { type: "text", name: "q2" },
            { type: "text", name: "q1", visibleIf: "{q2} = 1" },
            { type: "text", name: "q3", visibleIf: "{q1} = 2" },
          ],
        },
      ],
    };

    // Act
    const elements = obfuscate(json).pages[0].elements;

    // Assert
    expect(elements.map((e: any) => e.name)).toEqual(["q1", "q2", "q3"]);
    expect(elements[1].visibleIf).toBe("{q1} = 1");
    expect(elements[2].visibleIf).toBe("{q2} = 2");
  });
});
