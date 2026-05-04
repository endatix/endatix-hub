import { describe, expect, it } from "vitest";
import { Model } from "survey-core";
import { analyzeSurvey, analyzeSurveyModel } from "../form-assessment-logic";

describe("form assessment logic", () => {
  it("measures serialized JSON as UTF-8 bytes", () => {
    const jsonData = JSON.stringify({
      title: "Unicode: Здравей",
      pages: [],
    });

    const stats = analyzeSurvey(jsonData);

    expect(stats.uncompressedSize).toBe(
      new TextEncoder().encode(jsonData).length,
    );
    expect(stats.uncompressedSize).toBeGreaterThan(jsonData.length);
  });

  it("counts questions, choices, file uploads, and Scandit questions from JSON", () => {
    const surveyJson = {
      pages: [
        {
          elements: [
            {
              type: "dropdown",
              name: "country",
              choices: ["BG", "US", "DE"],
            },
            {
              type: "panel",
              name: "details",
              elements: [
                { type: "text", name: "name" },
                { type: "file", name: "attachment" },
                { type: "scandit", name: "barcode" },
              ],
            },
            {
              type: "paneldynamic",
              name: "household",
              templateElements: [{ type: "text", name: "member_name" }],
            },
            {
              type: "matrixdropdown",
              name: "products",
              columns: [
                {
                  name: "product",
                  cellType: "dropdown",
                  choices: ["A", "B"],
                },
              ],
            },
          ],
        },
      ],
    };

    const stats = analyzeSurvey(JSON.stringify(surveyJson));

    expect(stats.totalQuestions).toBe(7);
    expect(stats.dropdownCount).toBe(2);
    expect(stats.totalDropdownChoicesCount).toBe(5);
    expect(stats.maxDropdownChoicesCount).toBe(3);
    expect(stats.totalChoicesJsonSize).toBeGreaterThan(0);
    expect(stats.maxChoicesJsonSize).toBeGreaterThan(0);
    expect(stats.fileUploadCount).toBe(1);
    expect(stats.fileUploadWithoutBlobCount).toBe(1);
    expect(stats.scanditCount).toBe(1);
  });

  it("counts embedded base64 images from parsed JSON string values", () => {
    const surveyJson = {
      logo: "data:image/png;base64,AAAA",
      pages: [
        {
          elements: [
            {
              type: "html",
              name: "intro",
              html: '<img src="data:image/jpeg;base64,BBBB" />',
            },
          ],
        },
      ],
    };

    const stats = analyzeSurvey(JSON.stringify(surveyJson));

    expect(stats.embeddedImagesCount).toBe(2);
    expect(stats.embeddedImagesSizeBytes).toBe(6);
  });

  it("uses SurveyModel semantics for model-derived stats", () => {
    const survey = new Model({
      pages: [
        {
          elements: [
            {
              type: "dropdown",
              name: "country",
              choices: ["BG", "US", "DE"],
            },
            {
              type: "file",
              name: "attachment",
              storeDataAsText: false,
            },
            {
              type: "html",
              name: "intro",
              html: '<img src="data:image/png;base64,AAAA" />',
            },
            {
              type: "matrixdropdown",
              name: "products",
              columns: [
                {
                  name: "product",
                  cellType: "dropdown",
                  choices: ["A", "B"],
                },
              ],
            },
          ],
        },
      ],
    });

    const stats = analyzeSurveyModel(survey);

    expect(stats.totalQuestions).toBe(4);
    expect(stats.dropdownCount).toBe(2);
    expect(stats.totalDropdownChoicesCount).toBe(5);
    expect(stats.maxDropdownChoicesCount).toBe(3);
    expect(stats.fileUploadCount).toBe(1);
    expect(stats.fileUploadWithoutBlobCount).toBe(0);
    expect(stats.embeddedImagesCount).toBe(1);
    expect(stats.embeddedImagesSizeBytes).toBe(3);
  });
});
