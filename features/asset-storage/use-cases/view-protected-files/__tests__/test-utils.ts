import { Model } from "survey-core";

/**
 * Sample SurveyJS JSON with nested elements (panel containing questions).
 * This includes:
 * - Top-level image question
 * - Panel with nested HTML and image questions
 */
export const nestedElementsSurveyJson = {
  pages: [
    {
      name: "page1",
      elements: [
        {
          type: "image",
          name: "question1",
          imageLink: "https://testaccount.blob.core.windows.net/content/image1.jpg",
          imageFit: "cover",
          imageHeight: "auto",
          imageWidth: "100%",
        },
        {
          type: "panel",
          name: "panel1",
          elements: [
            {
              type: "html",
              name: "question3",
              html: "Hello Panel",
            },
            {
              type: "image",
              name: "question2",
              imageLink: "https://testaccount.blob.core.windows.net/content/image2.jpg",
              imageFit: "cover",
              imageHeight: "auto",
              imageWidth: "100%",
            },
          ],
        },
      ],
    },
  ],
  headerView: "advanced",
} as const;

/**
 * Creates a SurveyJS Model from the nested elements test JSON.
 * @returns A Model instance with nested panel structure
 */
export function createNestedElementsModel(): Model {
  return new Model(nestedElementsSurveyJson);
}

/**
 * Expected URLs from the nested elements survey JSON.
 * These are the storage URLs that should be discovered from the model.
 */
export const nestedElementsExpectedUrls = [
  "https://testaccount.blob.core.windows.net/content/image1.jpg",
  "https://testaccount.blob.core.windows.net/content/image2.jpg",
] as const;
