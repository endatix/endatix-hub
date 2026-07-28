import { beforeAll, describe, expect, it } from "vitest";
import { SurveyModel } from "survey-core";
import { registerDragCategorizeModel } from "@/lib/questions/drag-categorize/drag-categorize.registry";
import { copyChoiceItem, copyChoiceItemWithMedia } from "../copy-choice-item";

describe("copyChoiceItemWithMedia", () => {
  it("copies imageLink from imagepicker source to imagepicker target", () => {
    const survey = new SurveyModel({
      elements: [
        {
          type: "imagepicker",
          name: "src",
          choices: [
            {
              value: "img1",
              text: "Image 1",
              imageLink: "https://example.com/1.png",
            },
          ],
        },
        { type: "imagepicker", name: "target", choices: [] },
      ],
    });
    const src = survey.getQuestionByName("src")!;
    const target = survey.getQuestionByName("target")!;
    const sourceChoice = src.visibleChoices[0];

    const copied = copyChoiceItemWithMedia(target as never, sourceChoice);

    expect(copied.imageLink).toBe("https://example.com/1.png");

    target.choices = [copied];
    expect(target.choices[0]?.imageLink).toBe("https://example.com/1.png");
  });

  describe("across question types that name the image differently", () => {
    beforeAll(() => {
      registerDragCategorizeModel();
    });

    function createSurvey(): SurveyModel {
      return new SurveyModel({
        elements: [
          {
            type: "imagepicker",
            name: "picker",
            choices: [
              {
                value: "img1",
                text: "Image 1",
                imageLink: "https://example.com/1.png",
              },
            ],
          },
          {
            type: "dragcategorize",
            name: "categorize",
            choices: [
              {
                value: "img2",
                text: "Image 2",
                imageUrl: "https://example.com/2.png",
              },
            ],
            zones: [{ value: "zone_a" }, { value: "zone_b" }],
          },
          { type: "checkbox", name: "plain", choices: ["a"] },
        ],
      });
    }

    it("maps imagepicker imageLink onto a drag-categorize item's imageUrl", () => {
      // Arrange
      const survey = createSurvey();
      const source = survey.getQuestionByName("picker")!;
      const target = survey.getQuestionByName("categorize")!;

      // Act
      const copied = copyChoiceItemWithMedia(
        target as never,
        source.visibleChoices[0],
      );

      // Assert — imageLink is not a property of a drag-categorize item, so
      // without translation the chip would render as text only
      expect(
        (copied as unknown as { imageUrl?: string }).imageUrl,
      ).toBe("https://example.com/1.png");
    });

    it("maps a drag-categorize imageUrl onto an imagepicker item's imageLink", () => {
      // Arrange
      const survey = createSurvey();
      const source = survey.getQuestionByName("categorize")!;
      const target = survey.getQuestionByName("picker")!;

      // Act
      const copied = copyChoiceItemWithMedia(
        target as never,
        source.visibleChoices[0],
      );

      // Assert
      expect(copied.imageLink).toBe("https://example.com/2.png");
    });

    it("leaves items alone when the target has no image property", () => {
      // Arrange
      const survey = createSurvey();
      const source = survey.getQuestionByName("picker")!;
      const target = survey.getQuestionByName("plain")!;

      // Act
      const copied = copyChoiceItemWithMedia(
        target as never,
        source.visibleChoices[0],
      );

      // Assert
      expect(copied.value).toBe("img1");
      expect(
        (copied as unknown as { imageUrl?: string }).imageUrl,
      ).toBeUndefined();
    });

    it("keeps the image on a same-type copy", () => {
      // Arrange
      const survey = createSurvey();
      const question = survey.getQuestionByName("categorize")!;

      // Act
      const copied = copyChoiceItemWithMedia(
        question as never,
        question.visibleChoices[0],
      );

      // Assert
      expect(
        (copied as unknown as { imageUrl?: string }).imageUrl,
      ).toBe("https://example.com/2.png");
    });
  });
});
