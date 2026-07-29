import { beforeAll, describe, expect, it } from "vitest";
import {
  ItemValue,
  JsonObject,
  QuestionSelectBase,
  Serializer,
  SurveyModel,
} from "survey-core";
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

  describe("across item classes that name the image differently", () => {
    // A stand-in for any choice item that declares its image under another
    // name. Deliberately local: this shared utility must not know about any
    // particular question type, so neither should its test.
    const CUSTOM_ITEM = "copytestitem";

    beforeAll(() => {
      if (!Serializer.findClass(CUSTOM_ITEM)) {
        Serializer.addClass(
          CUSTOM_ITEM,
          [{ name: "imageUrl", type: "file" }],
          undefined,
          "itemvalue",
        );
      }
    });

    function createItem(type: string, json: Record<string, unknown>): ItemValue {
      const item = Serializer.createClass(type) as ItemValue;
      new JsonObject().toObject(json, item);
      return item;
    }

    /** A target question whose choice items are of the given class. */
    function targetFor(itemType: string): QuestionSelectBase {
      const survey = new SurveyModel({
        elements: [{ type: "imagepicker", name: "target", choices: [] }],
      });
      const target = survey.getQuestionByName("target") as QuestionSelectBase;
      if (itemType !== "imageitemvalue") {
        (target as unknown as { getItemValueType: () => string }).getItemValueType =
          () => itemType;
      }
      return target;
    }

    it("translates the image onto the property the target declares", () => {
      // Arrange
      const source = createItem("imageitemvalue", {
        value: "img1",
        imageLink: "https://example.com/1.png",
      });

      // Act
      const copied = copyChoiceItemWithMedia(targetFor(CUSTOM_ITEM), source);

      // Assert
      expect((copied as unknown as { imageUrl?: string }).imageUrl).toBe(
        "https://example.com/1.png",
      );
    });

    it("translates it back the other way", () => {
      // Arrange
      const source = createItem(CUSTOM_ITEM, {
        value: "img2",
        imageUrl: "https://example.com/2.png",
      });

      // Act
      const copied = copyChoiceItemWithMedia(targetFor("imageitemvalue"), source);

      // Assert
      expect(copied.imageLink).toBe("https://example.com/2.png");
    });

    it("leaves the item alone when the target declares no image property", () => {
      // Arrange
      const source = createItem("imageitemvalue", {
        value: "img1",
        imageLink: "https://example.com/1.png",
      });

      // Act
      const copied = copyChoiceItemWithMedia(targetFor("itemvalue"), source);

      // Assert
      expect(copied.value).toBe("img1");
      expect((copied as unknown as { imageUrl?: string }).imageUrl).toBeUndefined();
    });
  });
});
