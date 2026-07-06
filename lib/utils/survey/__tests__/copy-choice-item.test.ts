import { describe, expect, it } from "vitest";
import { SurveyModel } from "survey-core";
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
});
