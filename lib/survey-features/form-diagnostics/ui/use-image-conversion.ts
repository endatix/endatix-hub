import { useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  OriginalImageUploadContext,
  type StoreImage,
} from "../../rich-text/ui/image-upload-context";
import { convertImages } from "../convert-images";
import type { ConversionSession, ImageSnapshot } from "../conversion-session";

export function count(value: number, unit: string) {
  return `${value.toLocaleString()} ${unit}${value === 1 ? "" : "s"}`;
}

function report(snapshot: ImageSnapshot) {
  const { eligible, files, skipped } = snapshot.inventory;
  return `${count(eligible.length, "placement")} converted using ${count(files.length, "stored image")}. ${skipped.length} skipped.`;
}

function outcomeMessage(
  result: Awaited<ReturnType<typeof convertImages>>,
  snapshot: ImageSnapshot,
) {
  if (result === "converted") return report(snapshot);
  if (result === "stale")
    return "The definition changed. Review again. No changes applied.";
  if (result === "cancelled") return "Cancelled. No changes applied.";
  return `Upload failed at ${result.failed}. No changes applied. Retry conversion.`;
}

type State = {
  snapshot?: ImageSnapshot;
  expanded: boolean;
  busy: boolean;
  done: boolean;
  retry: boolean;
  stale: boolean;
  message: string;
};
class ImageReviewView {
  private request?: AbortController;
  private notify?: () => void;
  private state: State = {
    expanded: false,
    busy: false,
    done: false,
    retry: false,
    stale: false,
    message: "",
  };
  constructor(
    private readonly session: ConversionSession,
    private readonly store: StoreImage | null,
  ) {}

  subscribe = (notify: () => void) => {
    this.notify = notify;
    return () => {
      this.notify = undefined;
    };
  };
  read = () => this.state;
  private update(change: Partial<State>) {
    this.state = { ...this.state, ...change };
    this.notify?.();
  }
  scan = () => {
    try {
      const last = this.session.lastConversion;
      this.update({
        snapshot: last ?? this.session.review(),
        done: Boolean(last),
        retry: false,
        stale: false,
        message: last ? report(last) : "",
      });
    } catch {
      this.update({
        snapshot: undefined,
        message:
          "Cannot match the stored definition to the editor. Review your changes.",
      });
    }
  };
  open = () => {
    if (!this.state.done) this.scan();
    this.update({ expanded: true });
  };
  close = () => {
    if (this.request) this.request.abort();
    else this.update({ expanded: false });
  };
  stop = () => {
    this.request?.abort();
    this.request = undefined;
  };
  undo = () => {
    if (!this.session.undo()) {
      this.update({
        message: "The definition changed. Undo the later edits first.",
      });
      return;
    }
    this.scan();
    this.update({ message: "Conversion undone." });
  };
  private async transfer(snapshot: ImageSnapshot, controller: AbortController, store: StoreImage) {
    const result = await convertImages(this.session, snapshot, {
      store, signal: controller.signal, progress: message => this.update({ message }),
    });
    if (this.request !== controller) return;
    this.update({ done: result === "converted", retry: typeof result === "object", stale: result === "stale",
      expanded: typeof result === "object" || result === "cancelled",
      message: outcomeMessage(result, snapshot) });
  }
  convert = async () => {
    const snapshot = this.state.snapshot;
    if (!snapshot || !this.store || this.request) return;
    const controller = new AbortController();
    this.request = controller;
    this.update({ busy: true });
    try { await this.transfer(snapshot, controller, this.store); }
    catch { this.update({ message: "Could not apply this review. Review images again.", expanded: false }); }
    finally {
      if (this.request === controller) { this.request = undefined; this.update({ busy: false }); }
    }
  };
}

export function useImageConversion(session: ConversionSession) {
  const store = useContext(OriginalImageUploadContext);
  const view = useMemo(() => new ImageReviewView(session, store), [session, store]);
  useEffect(() => {
    view.scan();
    return view.stop;
  }, [view]);
  const { snapshot, ...state } = useSyncExternalStore(view.subscribe, view.read, view.read);
  return {
    ...state,
    review: snapshot?.inventory,
    enabled: Boolean(store),
    convert: view.convert,
    undo: view.undo,
    open: view.open,
    close: view.close,
  };
}
