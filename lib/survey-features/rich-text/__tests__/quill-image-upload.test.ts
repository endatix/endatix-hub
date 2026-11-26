// @vitest-environment jsdom
import Quill, { Delta } from "quill";
import { describe, expect, it, vi } from "vitest";
import { insertUploadedContent } from "../ui/insert-uploaded-content";
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

function setupEditor() {
  // jsdom provides DOM ranges but has no layout for Quill's focus scrolling.
  Range.prototype.getBoundingClientRect = () => new DOMRect();
  const container = document.body.appendChild(document.createElement("div"));
  const editor = new Quill(container);
  editor.setText("Left Right");
  editor.setSelection(5, 0, "silent");
  return editor;
}

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
        value: { files: [image] },
      });
      editor.root.dispatchEvent(event);
      await vi.waitFor(() =>
        expect(editor.root.innerHTML).toBe(
          `<p>Left <img src="${canonical}">Right</p>`,
        ),
      );
    } finally {
      stop();
      document.caretRangeFromPoint = original;
    }
  });

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
