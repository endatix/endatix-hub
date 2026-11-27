// @vitest-environment jsdom
import Quill, { Delta } from "quill";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";
import { insertUploadedContent } from "../ui/insert-uploaded-content";
import "../ui/responsive-image";
import {
  bindImageTransfers,
  type ImageTransfer,
} from "../ui/quill-image-transfers";

describe("Quill image insertion", () => {
  it("preserves typing while the transfer is pending and undoes only the insertion", async () => {
    const editor = new Quill(document.createElement("div"));
    editor.setText("Left Right");
    const transfer = Promise.withResolvers<Delta>();
    const controller = new AbortController();
    const pending = insertUploadedContent(
      editor,
      { index: 5, length: 0 },
      {
        load: () => transfer.promise,
        signal: controller.signal,
      },
    );
    editor.insertText(0, "More ", "user");
    transfer.resolve(
      new Delta().insert({ image: "https://storage.test/image.png" }),
    );
    await pending;
    expect(editor.getContents().ops).toEqual([
      { insert: "More Left " },
      { insert: { image: "https://storage.test/image.png" } },
      { insert: "Right\n" },
    ]);
    editor.history.undo();
    expect(editor.getText()).toBe("More Left Right\n");
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
  await vi.waitFor(() => expect(editor.root.querySelectorAll("img")).toHaveLength(3));
  expect(Array.from(editor.root.querySelectorAll("img"), img => img.src)).toEqual([
    "https://storage.test/first.png", "https://storage.test/second.png", "https://storage.test/third.png",
  ]);
  expect(editor.getText()).toBe("Left BeforeMiddleAfterRight\n");
  stop();
});

function setupEditor() {
  // jsdom provides DOM ranges but has no layout for Quill's focus scrolling.
  Range.prototype.getBoundingClientRect = () => new DOMRect();
  const container = document.body.appendChild(document.createElement("div"));
  const editor = new Quill(container);
  editor.setText("Left Right");
  editor.setSelection(5, 0, "silent");
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
  expect(editor.getText()).toBe("Left Right\n");
  stop();
});

function paste(editor: Quill, html: string, files: File[]) {
  const event = new Event("paste", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "clipboardData", {
    value: {
      files,
      getData: (type: string) => (type === "text/html" ? html : ""),
    },
  });
  editor.root.dispatchEvent(event);
}

describe("Quill image input", () => {
  it.each([
    ["", "Reef survey"],
    ['alt="Authored label"', "Authored label"],
    ['alt=""', ""],
  ])("keeps authored alt on mixed paste and suggests a name only when absent (%s)", async (attribute, expected) => {
    const editor = setupEditor();
    const file = new File(["pixels"], "Reef_survey.png", { type: "image/png" });
    const stop = bindImageTransfers(editor, async () => canonical, () => {});
    paste(editor, `<strong>Caption</strong><img ${attribute} src="cid:1">`, [file]);
    await vi.waitFor(() => expect(editor.root.querySelector("img")?.getAttribute("alt")).toBe(expected));
    expect(editor.root.querySelector("strong")?.textContent).toBe("Caption");
    stop();
  });
  it("uses the original file name for a new image even when storage returns an opaque key", async () => {
    const editor = setupEditor();
    const stop = bindImageTransfers(editor, async () => canonical, () => {});
    editor.uploader.upload({ index: 0, length: 0 }, [new File(["pixels"], "Harbor_at-sunset.png", {type:"image/png"})]);
    await vi.waitFor(() => expect(editor.root.querySelector("img")?.alt).toBe("Harbor at sunset"));
    stop();
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
    expect(editor.getText()).toBe("Left Right\n");
    jobs[0].retry?.();
    await vi.waitFor(() => expect(jobs).toHaveLength(0));
    expect(editor.root.innerHTML).toContain(
      `<strong>Before</strong><img src="${canonical}" width="60">After`,
    );
    expect(store).toHaveBeenCalledWith(image);
    stop();
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
    expect(editor.getContents().ops).toEqual([{ insert: "Left Right\n" }]);
    stop();
  });

  it("drops a file at the pointer's document position", async () => {
    const editor = setupEditor();
    const point = document.createRange();
    point.setStart(editor.root.querySelector("p")!.firstChild!, 5);
    point.collapse(true);
    const original = document.caretRangeFromPoint;
    document.caretRangeFromPoint = () => point;
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
      editor.root.dispatchEvent(event);
      await vi.waitFor(() => expect(editor.root.querySelector("img")?.alt).toBe("River bank"));
      expect(editor.getContents().ops[0].insert).toBe("Left ");
      expect(editor.root.querySelector("img")?.src).toBe(canonical);
    } finally {
      stop();
      document.caretRangeFromPoint = original;
    }
  });

  it("uses the clipboard file name for file-only paste", async () => {
    const editor = setupEditor();
    const stop = bindImageTransfers(editor, async () => canonical, () => {});
    paste(editor, "", [new File(["pixels"], "North-trail.png", {type:"image/png"})]);
    await vi.waitFor(() => expect(editor.root.querySelector("img")?.alt).toBe("North trail"));
    stop();
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
        editor.uploader.upload({ index: 5, length: 0 }, files);
      }
      await vi.waitFor(() => expect(store).toHaveBeenCalledTimes(1));
      if (action === "unmount paste") unmount();
      if (action === "cancel drop") jobs[0].cancel();
      first.resolve(canonical);
      await vi.waitFor(() => expect(jobs).toHaveLength(0));
      expect(store).toHaveBeenCalledTimes(action === "complete drop" ? 2 : 1);
      expect(editor.root.querySelectorAll("img")).toHaveLength(action === "complete drop" ? 2 : 0);
      unmount();
    },
  );

  it("retains Quill's inline file paste when storage is disabled", async () => {
    const editor = setupEditor();
    paste(editor, "", [image]);
    await vi.waitFor(() =>
      expect(editor.root.querySelector("img")?.src).toMatch(
        /^data:image\/png;base64,/,
      ),
    );
  });
});
