// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Action, SvgRegistry, type ListModel } from "survey-core";
import {
  SurveyCreatorModel,
  type TabJsonEditorBasePlugin,
} from "survey-creator-core";
import { addObfuscatedJsonDownload } from "../json-download-menu";
import { useJsonEditor } from "../use-json-editor.hook";

const FORM = {
  title: "Private title",
  pages: [
    {
      name: "page1",
      elements: [{ type: "text", name: "secretQuestion", title: "Secret" }],
    },
  ],
};

function setup(fileName = "Patient intake") {
  const creator = new SurveyCreatorModel();
  creator.JSON = FORM;
  creator.activeTab = "json";
  const plugin: TabJsonEditorBasePlugin = creator.getPlugin("json");
  const save = vi.fn();
  plugin.saveToFileHandler = save;
  const remove = addObfuscatedJsonDownload(creator, () => fileName);
  const exportAction = creator.toolbar.getActionById("svc-json-export");
  const list = exportAction.popupModel?.contentComponentData.model as ListModel;
  const items = list?.actions as Action[];
  const click = (index: number) => list.onItemClick(items[index]);
  return { creator, plugin, save, remove, exportAction, items, click };
}

async function savedText(save: ReturnType<typeof vi.fn>): Promise<string> {
  return (save.mock.calls[0][1] as Blob).text();
}

describe("addObfuscatedJsonDownload", () => {
  it("turns the JSON tab's download button into a menu of two downloads", () => {
    // Act
    const { exportAction, items } = setup();

    // Assert
    expect(exportAction.component).toBe("sv-action-bar-item-dropdown");
    expect(exportAction.visible).toBe(true);
    expect(items.map((item) => item.title)).toEqual([
      "Download JSON",
      "Download obfuscated JSON",
    ]);
  });

  it("shows the download icon on Download JSON and a shield on Download obfuscated JSON", () => {
    // Act
    const { exportAction, items } = setup();

    // Assert
    expect(items.map((item) => item.iconName)).toEqual([
      exportAction.iconName,
      "icon-download-obfuscated",
    ]);
    expect(items.map((item) => item.iconSize)).toEqual([
      exportAction.iconSize,
      exportAction.iconSize,
    ]);
    expect(SvgRegistry.icons["download-obfuscated"]).toContain("<path");
  });

  it("downloads the unchanged schema from Download JSON", async () => {
    // Arrange
    const { plugin, save, click } = setup();

    // Act
    click(0);

    // Assert
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0]).toBe("survey.json");
    expect(await savedText(save)).toBe(plugin.model!.text);
  });

  it("downloads an obfuscated copy as <form name>.obf.json and leaves the editor's form", async () => {
    // Arrange
    const { creator, save, click } = setup();
    const before = creator.text;

    // Act
    click(1);

    // Assert
    expect(save.mock.calls[0][0]).toBe("Patient intake.obf.json");
    const text = await savedText(save);
    expect(text).toContain('"name": "q1"');
    expect(text).not.toContain("secretQuestion");
    expect(text).not.toContain("Private title");
    expect(creator.text).toBe(before);
  });

  it("obfuscates the JSON as edited on the tab, before it is applied", async () => {
    // Arrange
    const { plugin, save, click } = setup();
    plugin.model!.text = JSON.stringify({
      pages: [{ elements: [{ type: "text", name: "typedJustNow" }] }],
    });

    // Act
    click(1);

    // Assert
    expect(await savedText(save)).not.toContain("typedJustNow");
    expect(await savedText(save)).toContain('"name": "q1"');
  });

  it("tells the author and downloads nothing when the JSON does not parse", () => {
    // Arrange
    const { creator, plugin, save, click } = setup();
    const notify = vi.spyOn(creator, "notify").mockImplementation(() => {});
    plugin.model!.text = "{ not json";

    // Act
    click(1);

    // Assert
    expect(save).not.toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(
      "Fix the JSON errors to download an obfuscated copy.",
      "error",
    );
  });

  it("names the file survey.obf.json when the form has no name", () => {
    // Arrange
    const { save, click } = setup("");

    // Act
    click(1);

    // Assert
    expect(save.mock.calls[0][0]).toBe("survey.obf.json");
  });

  it("swaps in the menu when the JSON tab's button arrives after it was added", () => {
    // Arrange
    const creator = new SurveyCreatorModel();
    const actions = creator.toolbar.actions;
    const builtIn = creator.toolbar.getActionById("svc-json-export");
    actions.splice(actions.indexOf(builtIn), 1);
    addObfuscatedJsonDownload(creator, () => "Late");
    actions.push(new Action({ id: "svc-json-export", mode: "small" }));

    // Act
    creator.activeTab = "json";

    // Assert
    expect(creator.toolbar.getActionById("svc-json-export").component).toBe(
      "sv-action-bar-item-dropdown",
    );
  });

  it("puts the stock download button back when removed", () => {
    // Arrange
    const { creator, remove, exportAction } = setup();
    const count = creator.toolbar.actions.length;

    // Act
    remove();

    // Assert
    const restored = creator.toolbar.getActionById("svc-json-export");
    expect(restored).not.toBe(exportAction);
    expect(restored.component).toBe("sv-action-bar-item");
    expect(creator.toolbar.actions).toHaveLength(count);
  });
});

describe("registerJsonEditor", () => {
  it("adds the download menu named after the form, and takes it out on cleanup", () => {
    // Arrange
    const { result, rerender } = renderHook(
      ({ downloadName }) => useJsonEditor({ downloadName }),
      { initialProps: { downloadName: "Draft" } },
    );
    const creator = new SurveyCreatorModel();
    creator.activeTab = "json";
    const plugin: TabJsonEditorBasePlugin = creator.getPlugin("json");
    const save = vi.fn();
    plugin.saveToFileHandler = save;
    let cleanup: () => void = () => {};
    act(() => {
      cleanup = result.current.registerJsonEditor(creator);
    });
    rerender({ downloadName: "Renamed form" });
    const menu = creator.toolbar.getActionById("svc-json-export");
    const list = menu.popupModel?.contentComponentData.model as ListModel;

    // Act
    list.onItemClick(list.actions[1]);
    cleanup();

    // Assert
    expect(save.mock.calls[0][0]).toBe("Renamed form.obf.json");
    expect(creator.toolbar.getActionById("svc-json-export").component).toBe(
      "sv-action-bar-item",
    );
  });
});
