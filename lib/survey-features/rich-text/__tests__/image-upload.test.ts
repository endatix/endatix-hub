// @vitest-environment jsdom
import { createFieldEditor } from "../ui/field-editor";
import { inlineImage } from "../ui/image-settings-target";
import { paste } from "./field-fixture";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { insertUploadedContent } from "../ui/insert-uploaded-content";
import {
  bindImageTransfers,
  type ImageTransfer,
} from "../ui/image-transfers";

describe("Rich text image insertion", () => {
  it("keeps text typed inside the selection while a replacement uploads", async () => {
    // Arrange
    const editor = setupEditor();
    const transfer = Promise.withResolvers<HTMLTemplateElement>();
    const pending = insertUploadedContent(editor, { from: 1, to: 5 }, {
      load: () => transfer.promise, signal: new AbortController().signal,
    });

    // Act
    editor.commands.insertContentAt(3, "new");
    const template = document.createElement("template");
    template.innerHTML = '<img src="https://storage.test/image.png">';
    transfer.resolve(template);
    await pending;

    // Assert
    expect(editor.getHTML()).toBe('<p><img src="https://storage.test/image.png">new Right</p>');
    editor.commands.undo();
    expect(editor.getText()).toBe("Lenewft Right");
  });

  it("preserves typing while the transfer is pending and undoes only the insertion", async () => {
    const editor = setupEditor();
    const transfer = Promise.withResolvers<HTMLTemplateElement>();
    const controller = new AbortController();
    const pending = insertUploadedContent(
      editor,
      { from: 6, to: 6 },
      {
        load: () => transfer.promise,
        signal: controller.signal,
      },
    );
    editor.commands.insertContentAt(1, "More ");
    const template = document.createElement("template");
    template.innerHTML = '<img src="https://storage.test/image.png">';
    transfer.resolve(template);
    await pending;
    expect(editor.getHTML()).toBe('<p>More Left <img src="https://storage.test/image.png">Right</p>');
    editor.commands.undo();
    expect(editor.getText()).toBe("More Left Right");
  });
});

const image = new File(["synthetic"], "image.png", { type: "image/png" });
const canonical = "https://storage.test/content/f/example.png";

it.each([false, true])("matches mixed clipboard bytes to their original occurrences (redundant file: %s)", async redundant => {
  // Arrange
  const editor = setupEditor();
  const first = new File(["first"], "First.png", { type: "image/png" });
  const second = new File(["second"], "Second.png", { type: "image/png" });
  const third = new File(["third"], "Third.png", { type: "image/png" });
  const store = vi.fn(async (file: File) => `https://storage.test/${await file.text()}.png`);
  const stop = bindImageTransfers(editor, store, () => {});

  // Act
  paste(editor, 'Before<img src="data:image/png;base64,Zmlyc3Q=">Middle<img src="cid:two"><img src="cid:three">After',
    redundant ? [first, second, third] : [second, third]);

  // Assert
  await vi.waitFor(() => expect(editor.view.dom.querySelectorAll<HTMLImageElement>("img[src]")).toHaveLength(3));
  expect(Array.from(editor.view.dom.querySelectorAll<HTMLImageElement>("img[src]"), img => img.src)).toEqual([
    "https://storage.test/first.png", "https://storage.test/second.png", "https://storage.test/third.png",
  ]);
  expect(editor.getText()).toBe("Left BeforeMiddleAfterRight");
  stop.dispose();
});

function setupEditor() {
  const editor = createFieldEditor({ element: document.body.appendChild(document.createElement("div")), content: "Left Right" });
  editor.commands.setTextSelection(6);
  return editor;
}

it("explains mismatched clipboard files without uploading, inserting, or offering Retry", async () => {
  // Arrange
  const editor = setupEditor();
  const store = vi.fn();
  const error = vi.spyOn(toast, "error");
  let jobs: ImageTransfer[] = [];
  const stop = bindImageTransfers(editor, store, next => { jobs = next; });

  // Act
  paste(editor, 'Before<img src="data:image/png;base64,Zmlyc3Q="><img src="cid:missing">After',
    [new File(["first"], "First.png", { type: "image/png" })]);

  // Assert
  await vi.waitFor(() => expect(error).toHaveBeenCalledWith(expect.stringContaining("Paste them separately")));
  expect(jobs).toHaveLength(0);
  expect(store).not.toHaveBeenCalled();
  expect(editor.getText()).toBe("Left Right");
  stop.dispose();
});

describe("Rich text image input", () => {
  it.each([
    ["", "Reef survey"],
    ['alt="Authored label"', "Authored label"],
    ['alt=""', ""],
  ])("keeps authored alt on mixed paste and suggests a name only when absent (%s)", async (attribute, expected) => {
    const editor = setupEditor();
    const file = new File(["pixels"], "Reef_survey.png", { type: "image/png" });
    const stop = bindImageTransfers(editor, async () => canonical, () => {});
    paste(editor, `<strong>Caption</strong><img ${attribute} src="cid:1">`, [file]);
    await vi.waitFor(() => expect(editor.view.dom.querySelector<HTMLImageElement>("img[src]")?.getAttribute("alt")).toBe(expected));
    expect(editor.view.dom.querySelector("strong")?.textContent).toBe("Caption");
    stop.dispose();
  });
  it("uses the original file name for a new image even when storage returns an opaque key", async () => {
    const editor = setupEditor();
    const stop = bindImageTransfers(editor, async () => canonical, () => {});
    stop.upload({ from: 1, to: 1 }, [new File(["pixels"], "Harbor_at-sunset.png", {type:"image/png"})]);
    await vi.waitFor(() => expect(editor.view.dom.querySelector<HTMLImageElement>("img[src]")?.alt).toBe("Harbor at sunset"));
    stop.dispose();
  });
  it("keeps mixed paste and surrounding text intact across failure and retry", async () => {
    const editor = setupEditor();
    const store = vi
      .fn()
      .mockRejectedValueOnce(Error())
      .mockResolvedValue(canonical);
    let jobs: ImageTransfer[] = [];
    const stop = bindImageTransfers(editor, store, (next) => {
      jobs = next;
    });
    paste(editor, '<b>Before</b><img src="cid:1" width="60">After', [image]);
    await vi.waitFor(() => expect(jobs[0].retry).toBeDefined());
    expect(editor.getText()).toBe("Left Right");
    jobs[0].retry?.();
    await vi.waitFor(() => expect(jobs).toHaveLength(0));
    expect(editor.getHTML()).toContain(
      `<strong>Before</strong><img src="${canonical}" width="60">After`,
    );
    expect(store).toHaveBeenCalledWith(image);
    stop.dispose();
  });

  it("ignores a completed PUT after the author cancels a file-only paste", async () => {
    const editor = setupEditor();
    const transfer = Promise.withResolvers<string>();
    let jobs: ImageTransfer[] = [];
    const stop = bindImageTransfers(
      editor,
      () => transfer.promise,
      (next) => {
        jobs = next;
      },
    );
    paste(editor, "", [image]);
    jobs[0].cancel();
    transfer.resolve(canonical);
    await vi.waitFor(() => expect(jobs).toHaveLength(0));
    expect(editor.getText()).toBe("Left Right");
    stop.dispose();
  });

  it("drops a file at the pointer's document position", async () => {
    const editor = setupEditor();
    const point = document.createRange();
    point.setStart(editor.view.dom.querySelector("p")!.firstChild!, 5);
    point.collapse(true);
    vi.spyOn(editor.view, "posAtCoords").mockReturnValue({ pos: editor.view.posAtDOM(point.startContainer, point.startOffset), inside: 0, affinity: 0 });
    const stop = bindImageTransfers(
      editor,
      async () => canonical,
      () => {},
    );
    try {
      const event = new MouseEvent("drop", { bubbles: true, cancelable: true });
      Object.defineProperty(event, "dataTransfer", {
        value: { files: [new File(["pixels"], "River_bank.png", {type:"image/png"})] },
      });
      editor.view.dom.dispatchEvent(event);
      await vi.waitFor(() => expect(editor.view.dom.querySelector<HTMLImageElement>("img[src]")?.alt).toBe("River bank"));
      expect(editor.view.dom.querySelector("p")?.firstChild?.textContent).toBe("Left ");
      expect(editor.view.dom.querySelector<HTMLImageElement>("img[src]")?.src).toBe(canonical);
    } finally {
      stop.dispose();
    }
  });

  it("uses the clipboard file name for file-only paste", async () => {
    const editor = setupEditor();
    const stop = bindImageTransfers(editor, async () => canonical, () => {});
    paste(editor, "", [new File(["pixels"], "North-trail.png", {type:"image/png"})]);
    await vi.waitFor(() => expect(editor.view.dom.querySelector<HTMLImageElement>("img[src]")?.alt).toBe("North trail"));
    stop.dispose();
  });

  it.each(["cancel drop", "unmount paste", "complete drop"])(
    "%s schedules only the remaining images still requested",
    async (action) => {
      const editor = setupEditor();
      const first = Promise.withResolvers<string>();
      const store = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValue(canonical);
      let jobs: ImageTransfer[] = [];
      const unmount = bindImageTransfers(editor, store, next => { jobs = next; });
      const files = [image, new File(["second"], "second.png", { type: "image/png" })];
      if (action === "unmount paste") {
        paste(editor, '<img src="cid:1"><img src="cid:2">', files);
      } else {
        unmount.upload({ from: 6, to: 6 }, files);
      }
      await vi.waitFor(() => expect(store).toHaveBeenCalledTimes(1));
      if (action === "unmount paste") unmount.dispose();
      if (action === "cancel drop") jobs[0].cancel();
      first.resolve(canonical);
      await vi.waitFor(() => expect(jobs).toHaveLength(0));
      expect(store).toHaveBeenCalledTimes(action === "complete drop" ? 2 : 1);
      expect(editor.view.dom.querySelectorAll<HTMLImageElement>("img[src]")).toHaveLength(action === "complete drop" ? 2 : 0);
      unmount.dispose();
    },
  );

  it("retains inline file paste when storage is disabled", async () => {
    const editor = setupEditor();
    const binding = bindImageTransfers(editor, inlineImage, () => {});
    paste(editor, "", [image]);
    await vi.waitFor(() =>
      expect(editor.view.dom.querySelector<HTMLImageElement>("img[src]")?.src).toMatch(
        /^data:image\/png;base64,/,
      ),
    );
    binding.dispose();
  });
});
