import { expect, it, vi } from "vitest";
import { SurveyCreatorModel } from "survey-creator-core";
import {
  bindConversionSource,
  conversionSession,
  prepareDefinitionSave,
} from "../conversion-session";
import { convertImages } from "../convert-images";
import { Result } from "@/lib/result";

const embedded = "data:image/png;base64,iVBORw0KGgo=";
const url = "https://storage.example/content/f/123/file.png";
function source(src: string) {
  return {
    pages: [
      {
        name: "one",
        elements: [
          {
            name: "question",
            type: "radiogroup",
            visible: true,
            choices: [
              {
                value: "a",
                text: { default: `<img src='${src}'><b>Caption</b>` },
              },
            ],
          },
        ],
      },
    ],
  };
}
function editor() {
  const creator = new SurveyCreatorModel();
  creator.JSON = source(embedded);
  bindConversionSource(creator, source(embedded));
  return { creator, session: conversionSession(creator)! };
}
function prepare(creator: SurveyCreatorModel) {
  const result = prepareDefinitionSave(creator, creator.JSON);
  if (Result.isError(result)) throw new Error(result.message);
  return result.value;
}
const transfer = () => ({
  signal: new AbortController().signal,
  progress: vi.fn(),
  store: vi.fn().mockResolvedValue(url),
});

it("preserves source structure through review, conversion, undo, and repeated Save preparation", async () => {
  // Arrange
  const { creator, session } = editor();
  const upload = transfer();
  creator.survey.title = "Edited before conversion";
  const review = session.review();

  // Act
  expect(await convertImages(session, review, upload)).toBe("converted");
  const converted = { ...source(url), title: "Edited before conversion" };

  // Assert
  expect(prepare(creator).payload).toEqual(converted);
  expect(prepare(creator).payload).toEqual(converted);
  expect(session.undo()).toBe(true);
  expect(prepare(creator).payload).toEqual({
    ...source(embedded),
    title: converted.title,
  });
  expect(await convertImages(session, session.review(), upload)).toBe(
    "converted",
  );
  expect(upload.store).toHaveBeenCalledTimes(1);
  expect(session.review().inventory.eligible).toHaveLength(0);
});

it("keeps edits made while a save was in flight and prepares a fresh retry", async () => {
  // Arrange
  const { creator, session } = editor();
  await convertImages(session, session.review(), transfer());
  const request = prepare(creator);

  // Act
  creator.survey.title = "Newer";

  // Assert
  expect(request.acknowledge()).toBe(false);
  expect(prepare(creator).payload).toEqual({ ...source(url), title: "Newer" });
});

it("preserves converted source across later saves, including edits during a retry", async () => {
  // Arrange
  const { creator, session } = editor();
  await convertImages(session, session.review(), transfer());
  expect(prepare(creator).acknowledge()).toBe(true);

  // Act
  creator.survey.title = "A later edit";
  const failed = prepare(creator);
  const retry = prepare(creator);
  creator.survey.title = "Newer edit";

  // Assert
  expect(failed.payload).toEqual({ ...source(url), title: "A later edit" });
  expect(retry.payload).toEqual(failed.payload);
  expect(retry.acknowledge()).toBe(false);
  expect(prepare(creator).payload).toEqual({ ...source(url), title: "Newer edit" });
  creator.survey.title = "";
  expect(prepare(creator).payload).toEqual(source(url));
});

it("retains completed transfers when cancelled, without replacing the definition", async () => {
  // Arrange
  const { creator, session } = editor();
  const controller = new AbortController();
  const upload = {
    ...transfer(),
    signal: controller.signal,
    store: vi.fn(async () => {
      controller.abort();
      return url;
    }),
  };

  // Act
  expect(await convertImages(session, session.review(), upload)).toBe(
    "cancelled",
  );

  // Assert
  expect(session.review().source).toEqual(source(embedded));
  expect(prepare(creator).payload).toEqual(creator.JSON);
  const retry = transfer();
  expect(await convertImages(session, session.review(), retry)).toBe(
    "converted",
  );
  expect(retry.store).not.toHaveBeenCalled();
});

it("rejects a stale review and leaves new edits intact", async () => {
  // Arrange
  const { creator, session } = editor();
  const review = session.review();
  const upload = transfer();
  upload.store.mockImplementation(async () => {
    creator.survey.title = "Newest";
    return url;
  });

  // Act & Assert
  expect(await convertImages(session, review, upload)).toBe("stale");
  expect(session.review().source).toEqual({
    ...source(embedded),
    title: "Newest",
  });
});

it("keeps Creator undo history and redoes all locales as a single conversion", async () => {
  // Arrange
  const { creator, session } = editor();
  creator.survey.title = "Earlier edit";
  const modified = vi.fn();
  creator.onModified.add(modified);

  // Act
  await convertImages(session, session.review(), transfer());

  // Assert
  expect(modified).toHaveBeenCalledTimes(1);
  creator.undo();
  expect(session.review().source).toEqual({
    ...source(embedded),
    title: "Earlier edit",
  });
  creator.undo();
  expect(session.review().source).toEqual(source(embedded));
  creator.redo();
  creator.redo();
  expect(prepare(creator).payload).toEqual({
    ...source(url),
    title: "Earlier edit",
  });
});

it("retains the first upload after a second file fails and retries only the missing file", async () => {
  // Arrange
  const { creator, session } = editor();
  creator.survey.logo = "data:image/gif;base64,R0lGODlh";
  const upload = transfer();
  upload.store
    .mockResolvedValueOnce(url)
    .mockRejectedValueOnce(new Error("unavailable"));
  const review = session.review();

  // Act & Assert
  expect(await convertImages(session, review, upload)).toMatchObject({
    failed: expect.any(String),
  });
  expect(session.review().source).toEqual(review.source);
  expect(await convertImages(session, review, upload)).toBe("converted");
  expect(upload.store).toHaveBeenCalledTimes(3);
  expect(session.review().inventory.eligible).toHaveLength(0);
});
it("keeps the authored elements shorthand when editing a question before conversion", async () => {
  // Arrange
  const creator = new SurveyCreatorModel();
  const original = { elements: [{ name: "one", type: "text", visible: true }], logo: embedded };
  creator.JSON = original;
  bindConversionSource(creator, original);
  const session = conversionSession(creator)!;
  creator.survey.getQuestionByName("one").title = "Edited";

  // Act
  await convertImages(session, session.review(), transfer());

  // Assert
  expect(prepare(creator).payload).toEqual({ elements: [{ ...original.elements[0], title: "Edited" }], logo: url });
});
