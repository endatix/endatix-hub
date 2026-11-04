// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
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

  it("scrambles letters of any script into Latin letters of the same case", () => {
    // Act
    const cyrillic = obfuscateText("Здравей, Свят", () => 0);
    const greek = obfuscateText("Γειά σου", () => 0);
    const cjk = obfuscateText("你好", () => 0);

    // Assert
    expect(cyrillic).toBe("Aaaaaaa, Aaaa");
    expect(greek).toBe("Aaaa aaa");
    expect(cjk).toBe("aa");
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

describe("obfuscateSurveyJson scopes and nested text", () => {
  function pageElements(json: object) {
    return obfuscate(json).pages[0].elements;
  }

  it("resolves a name used at the top level and in a dynamic panel by scope", () => {
    // Arrange
    const json = {
      pages: [
        {
          elements: [
            { type: "text", name: "age" },
            {
              type: "paneldynamic",
              name: "kids",
              templateElements: [
                { type: "text", name: "age" },
                {
                  type: "text",
                  name: "school",
                  visibleIf: "{panel.age} > 5",
                },
              ],
            },
            {
              type: "text",
              name: "note",
              visibleIf: "{age} > 18 and {kids[0].age} > 1",
            },
          ],
        },
      ],
    };

    // Act
    const [age, kids, note] = pageElements(json);

    // Assert
    expect([age.name, kids.name, note.name]).toEqual(["q1", "q2", "q5"]);
    expect(kids.templateElements.map((e: any) => e.name)).toEqual(["q3", "q4"]);
    expect(kids.templateElements[1].visibleIf).toBe("{panel.q3} > 5");
    expect(note.visibleIf).toBe("{q1} > 18 and {q2[0].q3} > 1");
  });

  it("keeps the spacing and case of a reference it renames", () => {
    // Arrange
    const json = {
      pages: [
        {
          elements: [
            { type: "text", name: "age" },
            {
              type: "paneldynamic",
              name: "kids",
              templateElements: [
                { type: "text", name: "age" },
                {
                  type: "paneldynamic",
                  name: "toys",
                  templateElements: [
                    {
                      type: "text",
                      name: "toy",
                      visibleIf: "{ ParentPanel.age } > 5 and {Panel.Toy}",
                    },
                  ],
                },
              ],
            },
            {
              type: "text",
              name: "note",
              visibleIf:
                "{ Age } > 18 and { kids[ 0 ].age } > 1 and {kids [0].age}",
            },
          ],
        },
      ],
    };

    // Act
    const [, kids, note] = pageElements(json);

    // Assert
    expect(kids.templateElements[1].templateElements[0].visibleIf).toBe(
      "{ ParentPanel.q3 } > 5 and {Panel.q5}",
    );
    expect(note.visibleIf).toBe(
      "{ q1 } > 18 and { q2[ 0 ].q3 } > 1 and {q2 [0].q3}",
    );
  });

  it("keeps matrix column and multiple text item names, and references into them", () => {
    // Arrange
    const json = {
      pages: [
        {
          elements: [
            { type: "text", name: "a" },
            {
              type: "matrixdropdown",
              name: "grid",
              rows: ["r1"],
              columns: [
                { name: "a", cellType: "text" },
                { name: "b", cellType: "text", visibleIf: "{row.a} = 1" },
              ],
            },
            {
              type: "multipletext",
              name: "contact",
              items: [{ name: "first" }],
            },
            {
              type: "text",
              name: "check",
              visibleIf: "{contact.first} notempty and {grid.r1.a} = 1",
            },
          ],
        },
      ],
    };

    // Act
    const [, grid, contact, check] = pageElements(json);

    // Assert
    expect(grid.columns.map((c: any) => c.name)).toEqual(["a", "b"]);
    expect(grid.columns[1].visibleIf).toBe("{row.a} = 1");
    expect(contact.items[0].name).toBe("first");
    expect(check.name).toBe("q4");
    expect(check.visibleIf).toBe("{q3.first} notempty and {q2.r1.a} = 1");
  });

  it("adds no state from running the form", () => {
    // Act
    const [first, second] = pageElements({
      pages: [
        {
          elements: [
            { type: "text", name: "a" },
            { type: "text", name: "b", visibleIf: "{a} = 1" },
          ],
        },
      ],
    });

    // Assert
    expect(first).toEqual({ type: "text", name: "q1" });
    expect(second).toEqual({ type: "text", name: "q2", visibleIf: "{q1} = 1" });
  });

  it("scrambles text in matrix columns, multiple text items and survey buttons", () => {
    // Arrange
    const json = {
      completeText: "Send secret",
      pages: [
        {
          elements: [
            {
              type: "matrixdropdown",
              name: "grid",
              rows: [{ value: "r1", text: "Secret row" }],
              columns: [
                {
                  name: "c",
                  title: "Secret column",
                  cellType: "dropdown",
                  placeholder: "Secret placeholder",
                  choices: [{ value: 1, text: "Secret choice" }],
                },
              ],
            },
            {
              type: "multipletext",
              name: "contact",
              items: [{ name: "first", title: "Secret item" }],
            },
            {
              type: "paneldynamic",
              name: "kids",
              panelAddText: "Add secret",
              templateElements: [{ type: "text", name: "k", title: "Kid" }],
            },
          ],
        },
      ],
    };

    // Act
    const text = JSON.stringify(obfuscate(json));

    // Assert
    expect(text).not.toMatch(/Secret|secret|Kid/);
  });

  it("gives a choice, row or column that has only a value a scrambled text, and keeps the value", () => {
    // Arrange
    const json = {
      pages: [
        {
          elements: [
            { type: "radiogroup", name: "habit", choices: ["Smoker", 2] },
            {
              type: "matrix",
              name: "week",
              rows: ["Monday"],
              columns: ["Often"],
            },
            { type: "text", name: "why", visibleIf: "{habit} = 'Smoker'" },
          ],
        },
      ],
    };

    // Act
    const [habit, week, why] = pageElements(json);

    // Assert
    expect(habit.choices).toEqual([{ value: "Smoker", text: "Nnnnnn" }, 2]);
    expect(week.rows).toEqual([{ value: "Monday", text: "Nnnnnn" }]);
    expect(week.columns).toEqual([{ value: "Often", text: "Nnnnn" }]);
    expect(why.visibleIf).toBe("{q1} = 'Smoker'");
  });

  it("scrambles text in a matrix's detail panel", () => {
    // Arrange
    const json = {
      pages: [
        {
          elements: [
            {
              type: "matrixdynamic",
              name: "meds",
              detailPanelMode: "underRow",
              columns: [{ name: "dose", cellType: "text" }],
              detailElements: [
                { type: "text", name: "note", title: "Secret detail" },
              ],
            },
          ],
        },
      ],
    };

    // Act
    const [meds] = pageElements(json);

    // Assert
    expect(meds.detailElements).toHaveLength(1);
    expect(JSON.stringify(meds)).not.toMatch(/Secret/);
  });

  it("renames a dynamic panel's keyName and names quoted in displayValue and propertyValue", () => {
    // Arrange
    const json = {
      pages: [
        {
          elements: [
            { type: "text", name: "ssn" },
            {
              type: "paneldynamic",
              name: "kids",
              keyName: "kidName",
              templateElements: [{ type: "text", name: "kidName" }],
            },
            {
              type: "expression",
              name: "shown",
              expression:
                "displayValue('ssn') + propertyValue(\"kids\", 'title')",
            },
          ],
        },
      ],
    };

    // Act
    const [, kids, shown] = pageElements(json);

    // Assert
    expect(kids.keyName).toBe("q3");
    expect(shown.expression).toBe(
      "displayValue('q1') + propertyValue(\"q2\", 'title')",
    );
  });

  it("does not request choices from a choicesByUrl endpoint", () => {
    // Arrange
    const open = vi.spyOn(XMLHttpRequest.prototype, "open");

    // Act
    pageElements({
      pages: [
        {
          elements: [
            {
              type: "dropdown",
              name: "country",
              choicesByUrl: { url: "https://example.test/countries" },
            },
          ],
        },
      ],
    });

    // Assert
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });
});
