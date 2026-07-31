import { ItemValue, SvgRegistry } from "survey-core";
import { getLocaleStrings, SurveyCreatorModel } from "survey-creator-core";
import { beforeAll, describe, expect, it, vi } from "vitest";
import {
  DRAG_CATEGORIZE_DISPLAY_NAME,
  DRAG_CATEGORIZE_TYPE,
} from "../constants";
import { bindDragCategorizeToCreator } from "../drag-categorize.creator";
import type { DragCategorizeQuestion } from "../drag-categorize.model";
import { registerDragCategorizeModel } from "../drag-categorize.registry";

function createBoundCreator(): SurveyCreatorModel {
  const creator = new SurveyCreatorModel({});
  bindDragCategorizeToCreator(creator);
  creator.JSON = {
    pages: [
      {
        elements: [
          {
            type: DRAG_CATEGORIZE_TYPE,
            name: "q1",
            choices: ["item1"],
            zones: [{ value: "zone1" }],
          },
        ],
      },
    ],
  };
  return creator;
}

function fireItemValueAdded(
  creator: SurveyCreatorModel,
  question: DragCategorizeQuestion,
  propertyName: string,
  newItem: ItemValue,
  itemValues: ItemValue[],
): void {
  creator.onItemValueAdded.fire(creator, {
    element: question,
    propertyName,
    newItem,
    itemValues,
  });
}

describe("bindDragCategorizeToCreator", () => {
  beforeAll(() => {
    registerDragCategorizeModel();
  });

  it("renames new zone collection items to zone1..zoneN", () => {
    // Arrange
    const creator = createBoundCreator();
    const question = creator.survey.getQuestionByName(
      "q1",
    ) as unknown as DragCategorizeQuestion;
    const newItem = new ItemValue("item2");

    // Act — mimics the property grid adding a zone row
    fireItemValueAdded(creator, question, "zones", newItem, [
      ...question.zones,
      newItem,
    ]);

    // Assert
    expect(newItem.value).toBe("zone2");
  });

  it("skips the zone1 value when it is already taken", () => {
    // Arrange
    const creator = createBoundCreator();
    const question = creator.survey.getQuestionByName(
      "q1",
    ) as unknown as DragCategorizeQuestion;
    const newItem = new ItemValue("item5");

    // Act
    fireItemValueAdded(creator, question, "zones", newItem, [
      ...question.zones,
      newItem,
    ]);

    // Assert — zone1 exists, so the next free name is zone2
    expect(newItem.value).toBe("zone2");
  });

  it("labels the toolbox item with a human-readable name", () => {
    // Arrange & Act
    const creator = createBoundCreator();
    const toolboxItem = creator.toolbox.getItemByName(DRAG_CATEGORIZE_TYPE);

    // Assert — without a qt entry the Creator falls back to the raw type name.
    expect(getLocaleStrings("en").qt[DRAG_CATEGORIZE_TYPE]).toBe(
      DRAG_CATEGORIZE_DISPLAY_NAME,
    );
    expect(toolboxItem?.title).toBe(DRAG_CATEGORIZE_DISPLAY_NAME);
  });

  it("registers a toolbox icon the Creator theme can tint", () => {
    // Arrange & Act
    createBoundCreator();
    const icon = SvgRegistry.icons[DRAG_CATEGORIZE_TYPE];

    // Assert — the toolbox tints icons via `fill`, so hard-coded fill/stroke
    // attributes would render the icon black next to the built-in ones.
    expect(icon).toBeDefined();
    expect(icon).not.toMatch(/(fill|stroke)=/);
  });

  it("gives new questions two default zones via the toolbox item", () => {
    // Arrange & Act
    const creator = createBoundCreator();
    const toolboxItem = creator.toolbox.getItemByName(DRAG_CATEGORIZE_TYPE);

    // Assert
    expect(toolboxItem?.json?.zones).toEqual([
      { value: "zone1" },
      { value: "zone2" },
    ]);
  });

  it("blocks deleting a zone when only two remain", () => {
    // Arrange
    const creator = createBoundCreator();
    const question = creator.survey.getQuestionByName(
      "q1",
    ) as unknown as DragCategorizeQuestion;
    const twoZones = [new ItemValue("zone1"), new ItemValue("zone2")];
    const options = {
      element: question,
      propertyName: "zones",
      property: null as never,
      collection: twoZones,
      item: twoZones[1],
      allowAdd: true,
      allowDelete: true,
      allowEdit: true,
    };

    // Act
    creator.onCollectionItemAllowOperations.fire(creator, options);

    // Assert
    expect(options.allowDelete).toBe(false);
  });

  it("allows deleting a zone when more than two exist", () => {
    // Arrange
    const creator = createBoundCreator();
    const question = creator.survey.getQuestionByName(
      "q1",
    ) as unknown as DragCategorizeQuestion;
    const threeZones = [
      new ItemValue("zone1"),
      new ItemValue("zone2"),
      new ItemValue("zone3"),
    ];
    const options = {
      element: question,
      propertyName: "zones",
      property: null as never,
      collection: threeZones,
      item: threeZones[2],
      allowAdd: true,
      allowDelete: true,
      allowEdit: true,
    };

    // Act
    creator.onCollectionItemAllowOperations.fire(creator, options);

    // Assert
    expect(options.allowDelete).toBe(true);
  });

  describe("image property editor placement", () => {
    interface MatrixLike {
      columns: { name: string }[];
      visibleRows: {
        showDetailPanel: () => void;
        detailPanel?: { questions: { name: string; getType: () => string }[] };
      }[];
    }

    function getChoicesMatrix(creator: SurveyCreatorModel): MatrixLike {
      const question = creator.survey.getQuestionByName("q1");
      creator.selectElement(question);
      return creator.propertyGrid.getQuestionByName(
        "choices",
      ) as never as MatrixLike;
    }

    it("keeps imageUrl out of the Items table columns", () => {
      // Arrange
      const creator = createBoundCreator();

      // Act
      const columns = getChoicesMatrix(creator).columns.map((c) => c.name);

      // Assert — a matrix cell cannot host the Creator's fileedit control; it
      // silently degrades to cellType "text" (a URL box with no Select File
      // button), so this property must not become a column.
      expect(columns).not.toContain("imageUrl");
      expect(columns).toEqual(["value", "text", "allowMultipleZones"]);
    });

    it("routes item image uploads through creator.onUploadFile", () => {
      // Arrange — SurveyJS base64-encodes the file itself whenever
      // creator.onUploadFile has no handler, so this asserts the storage
      // pipeline is reached and its returned URL is what gets stored.
      const creator = createBoundCreator();
      const matrix = getChoicesMatrix(creator);
      const row = matrix.visibleRows[0];
      row.showDetailPanel();
      const imageQuestion = row.detailPanel?.questions.find(
        (q) => q.name === "imageUrl",
      ) as never as { loadFiles?: (files: File[]) => void; value?: unknown };

      const uploadHandler = vi.fn(
        (_sender: unknown, options: { callback: (...args: unknown[]) => void }) => {
          options.callback("success", "https://storage.example/blob.png");
        },
      );
      creator.onUploadFile.add(uploadHandler as never);

      // Act
      imageQuestion.loadFiles?.([
        new File(["x"], "pic.png", { type: "image/png" }),
      ]);

      // Assert
      expect(uploadHandler).toHaveBeenCalledTimes(1);
      expect(imageQuestion.value).toBe("https://storage.example/blob.png");
      expect(String(imageQuestion.value)).not.toContain("base64");
    });

    it("renders imageUrl as a file editor in the row detail panel", () => {
      // Arrange
      const matrix = getChoicesMatrix(createBoundCreator());
      const row = matrix.visibleRows[0];

      // Act
      row.showDetailPanel();
      const imageQuestion = row.detailPanel?.questions.find(
        (q) => q.name === "imageUrl",
      );

      // Assert — fileedit is the control with the Select File button that
      // routes uploads through creator.onUploadFile.
      expect(imageQuestion).toBeDefined();
      expect(imageQuestion?.getType()).toBe("fileedit");
    });
  });

  it("leaves choices collection items untouched", () => {
    // Arrange
    const creator = createBoundCreator();
    const question = creator.survey.getQuestionByName(
      "q1",
    ) as unknown as DragCategorizeQuestion;
    const newItem = new ItemValue("item2");

    // Act
    fireItemValueAdded(creator, question, "choices", newItem, [
      ...question.choices,
      newItem,
    ]);

    // Assert
    expect(newItem.value).toBe("item2");
  });
});
