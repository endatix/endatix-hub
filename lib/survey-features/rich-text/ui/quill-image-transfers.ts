import { Delta, type default as Quill, type Range } from "quill";
import type { StoreImage } from "./image-upload-context";
import { insertUploadedContent } from "./insert-uploaded-content";
import { pastedImageContent } from "./pasted-image-content";

export interface ImageTransfer {
  readonly id: string;
  cancel(): void;
  retry?: () => void;
}

type LoadContent = (signal: AbortSignal) => Promise<Delta>;

class Transfer implements ImageTransfer {
  readonly id = crypto.randomUUID();
  private readonly controller = new AbortController();
  retry?: () => void;
  constructor(private readonly changed: () => void) {}

  cancel = () => {
    this.controller.abort();
    this.retry?.();
  };

  async submit(editor: Quill, range: Range, load: LoadContent) {
    const signal = this.controller.signal;
    const loadWithRetry = async (): Promise<Delta> => {
      while (!signal.aborted) {
        try {
          return await load(signal);
        } catch {
          await this.waitForRetry();
        }
      }
      return new Delta();
    };
    await insertUploadedContent(editor, range, { signal, load: loadWithRetry });
  }

  private waitForRetry() {
    if (this.controller.signal.aborted) return;
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

export function bindImageTransfers(editor: Quill, store: StoreImage, publish: Publish) {
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
  const unbind = bindImageInputs(editor, store, start);
  return () => {
    unbind();
    active.forEach((job) => job.cancel());
  };
}

type Start = (range: Range, load: LoadContent) => void;

function bindImageInputs(editor: Quill, store: StoreImage, start: Start) {
  const original = editor.uploader.upload;
  editor.uploader.upload = (range, files) => {
    const images = Array.from(files).filter(file => file.type.startsWith("image/"));
    if (!editor.isEnabled() || !images.length) return;
    start(range, fileContent(images, store));
  };
  const paste = (event: ClipboardEvent) => {
    if (!editor.isEnabled() || !event.clipboardData) return;
    const load = pastedImageContent(editor, event.clipboardData, store);
    if (!load) return;
    event.preventDefault();
    start(editor.getSelection(true), load);
  };
  editor.root.addEventListener("paste", paste, true);
  return () => {
    editor.root.removeEventListener("paste", paste, true);
    editor.uploader.upload = original;
  };
}

function fileContent(files: File[], store: StoreImage) {
  const uploaded = new Map<File, string>();
  return async (signal: AbortSignal) => {
    const content = new Delta();
    for (const file of files) {
      signal.throwIfAborted();
      const url = uploaded.get(file) ?? (await store(file));
      uploaded.set(file, url);
      content.insert({ image: url });
    }
    return content;
  };
}
