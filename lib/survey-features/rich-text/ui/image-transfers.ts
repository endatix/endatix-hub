import type { Editor, Range } from "@tiptap/core";
import type { StoreImage } from "./image-upload-context";
import { insertUploadedContent } from "./insert-uploaded-content";
import { pastedImageContent } from "./pasted-image-content";
import { fileLabel } from "./image-label";
import { ClipboardImageError } from "./clipboard-image-files";
import { toast } from "sonner";

export interface ImageTransfer {
  readonly id: string;
  cancel(): void;
  retry?: () => void;
}

type LoadContent = (signal: AbortSignal) => Promise<HTMLTemplateElement>;

class Transfer implements ImageTransfer {
  readonly id = crypto.randomUUID();
  private readonly controller = new AbortController();
  retry?: () => void;
  constructor(private readonly changed: () => void) {}

  cancel = () => {
    this.controller.abort();
    this.retry?.();
  };

  async submit(editor: Editor, range: Range, load: LoadContent) {
    const signal = this.controller.signal;
    const loadWithRetry = async () => {
      while (!signal.aborted) {
        try {
          return await load(signal);
        } catch (error) {
          await this.handleFailure(error);
        }
      }
      return document.createElement("template");
    };
    await insertUploadedContent(editor, range, { signal, load: loadWithRetry });
  }

  private handleFailure(error: unknown) {
    if (this.controller.signal.aborted) return;
    if (error instanceof ClipboardImageError) {
      toast.error(error.message);
      this.cancel();
      return;
    }
    return new Promise<void>((resolve) => {
      this.retry = () => {
        this.retry = undefined;
        this.changed();
        resolve();
      };
      this.changed();
    });
  }
}

type Publish = (jobs: ImageTransfer[]) => void;

export function bindImageTransfers(editor: Editor, store: StoreImage, options: Publish | { publish: Publish; choiceLabel: boolean }) {
  const publish = typeof options === "function" ? options : options.publish;
  const choice = typeof options !== "function" && options.choiceLabel;
  const queue = transferQueue(editor, publish);
  const inputs = bindImageInputs(editor, store, choice ? insertChoiceImages(queue.start) : queue.start);
  return { upload: inputs.upload, dispose() { inputs.unbind(); queue.cancel(); } };
}

function transferQueue(editor: Editor, publish: Publish) {
  const active = new Set<Transfer>();
  const changed = () => publish([...active]);
  const start: Start = (range, load) => {
    const job = new Transfer(changed);
    active.add(job);
    changed();
    void job.submit(editor, range, load).finally(() => {
      active.delete(job);
      changed();
    });
  };
  return { start, cancel: () => active.forEach(job => job.cancel()) };
}

type Start = (range: Range, load: LoadContent) => void;

function insertChoiceImages(start: Start): Start {
  return (range, load) => start(range, async signal => sizeNewChoiceImages(await load(signal)));
}

function sizeNewChoiceImages(template: HTMLTemplateElement) {
  for (const image of template.content.querySelectorAll("img")) {
    if (!image.width && !image.height && !image.style.width && !image.style.maxWidth && !image.style.height) {
      image.style.maxWidth = "min(100%, 100px)";
      image.style.height = "auto";
    }
  }
  return template;
}

function imageInputs(editor: Editor, store: StoreImage, start: Start) {
  const upload = (range: Range, files: ArrayLike<File>) => {
    const images = Array.from(files).filter(file => file.type.startsWith("image/"));
    if (!editor.isEditable || !images.length) return false;
    start(range, fileContent(images, store));
    return true;
  };
  const paste = (event: ClipboardEvent) => {
    if (!editor.isEditable || !event.clipboardData) return;
    const load = pastedImageContent(event.clipboardData, store);
    if (load) start(editor.state.selection, load);
    else if (event.clipboardData.getData("text/html") || !upload(editor.state.selection, event.clipboardData.files)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  return { upload, paste };
}

function bindImageInputs(editor: Editor, store: StoreImage, start: Start) {
  const { upload, paste } = imageInputs(editor, store, start);
  const drop = (event: DragEvent) => {
    if (!event.dataTransfer?.files.length) return;
    const pos = editor.view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
    if (pos === undefined || !upload({ from: pos, to: pos }, event.dataTransfer.files)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const root = editor.view.dom;
  root.addEventListener("paste", paste, true);
  root.addEventListener("drop", drop, true);
  return { upload, unbind() {
    root.removeEventListener("paste", paste, true);
    root.removeEventListener("drop", drop, true);
  } };
}

function fileContent(files: File[], store: StoreImage) {
  const uploaded = new Map<File, string>();
  return async (signal: AbortSignal) => {
    const content = document.createElement("template");
    for (const file of files) {
      signal.throwIfAborted();
      const url = uploaded.get(file) ?? (await store(file));
      uploaded.set(file, url);
      const alt = fileLabel(file.name);
      const image = document.createElement("img");
      image.src = url;
      if (alt) { image.alt = alt; image.dataset.imageLabel = alt; }
      content.content.append(image);
    }
    return content;
  };
}
