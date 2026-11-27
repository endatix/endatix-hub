import { useContext, useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ImageThumbnailPicker } from "./image-thumbnail-picker";
import { fileLabel } from "./image-label";
import { ImageUploadContext, type StoreImage } from "./image-upload-context";
import { imageDraft, inlineImage, type ImageTarget } from "./image-settings-target";

type Settings = { alt: string | null; width: string; cap: string };

function settings(image: HTMLImageElement): Settings {
  return {
    alt: image.getAttribute("alt"),
    width: image.style.width || image.getAttribute("width") || "",
    cap: image.style.maxWidth.replace(/^min\(100%,\s*(\d+px)\)$/, "$1"),
  };
}

function dimension(value: string) {
  const size = value.trim();
  return /^\d+(?:\.\d+)?$/.test(size) ? `${size}px` : size;
}

function applySettings(image: HTMLImageElement, draft: Settings) {
  const saved = settings(image);
  if (draft.alt !== null) image.alt = draft.alt;
  if (draft.width === saved.width && draft.cap === saved.cap) return image;
  if (draft.width !== saved.width) {
    image.removeAttribute("width");
    image.style.width = dimension(draft.width);
  }
  image.removeAttribute("height");
  if (draft.cap !== saved.cap || !saved.cap) {
    image.style.maxWidth = draft.cap ? `min(100%, ${dimension(draft.cap)})` : "100%";
  }
  image.style.height = "auto";
  return image;
}

function ImageFields({ draft, change }: Readonly<{ draft: Settings; change: (edit: Partial<Settings>) => void }>) {
  const id = useId();
  return <div className="grid gap-4">
    <div className="grid gap-2">
      <Label htmlFor={`${id}-alt`}>Alt text</Label>
      <Input id={`${id}-alt`} aria-describedby={`${id}-hint`} value={draft.alt ?? ""} onChange={e => change({ alt: e.target.value })} />
      <p id={`${id}-hint`} className="text-sm text-muted-foreground">Describe what matters, for example “Trail map with the north entrance marked.” Leave blank for a decorative image.</p>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2"><Label htmlFor={`${id}-width`}>Width</Label><Input id={`${id}-width`} placeholder="Auto" value={draft.width} onChange={e => change({ width: e.target.value })} /></div>
      <div className="grid gap-2"><Label htmlFor={`${id}-cap`}>Maximum width</Label><Input id={`${id}-cap`} placeholder="No cap" value={draft.cap} onChange={e => change({ cap: e.target.value })} /></div>
    </div>
    <p className="text-sm text-muted-foreground">Enter pixels or a CSS length. Height adjusts automatically.</p>
  </div>;
}

function validSize(value: string, saved: string) {
  return value === saved || value === "" || /^(?:[1-9]\d*(?:\.\d+)?)(?:px|%|em|rem|vw)?$/.test(value);
}

function settingsChanged(draft: Settings, saved: Settings) {
  return draft.alt !== saved.alt || draft.width !== saved.width || draft.cap !== saved.cap;
}

interface EditorProps { target: ImageTarget; index: number; close(): void }

async function replaceSource(image: HTMLImageElement, store: StoreImage, file: File) {
  image.src = await store(file);
  image.removeAttribute("srcset");
  const label = fileLabel(file.name);
  if (label) image.dataset.imageLabel = label;
  else delete image.dataset.imageLabel;
}

function useApplyImage({target, index, close}: EditorProps) {
  const store = useContext(ImageUploadContext) ?? inlineImage;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useMounted();
  async function apply(image: HTMLImageElement | null, file?: File) {
    setBusy(true);
    try {
      if (file && image) await replaceSource(image, store, file);
      if (!alive.current) return;
      if (target.commit(index, image)) close();
      else setError("The content changed. Close and reopen image settings.");
    } catch {
      if (alive.current) setError("Could not store the image. Apply again to retry.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return {apply, busy, error};
}

function useMounted() {
  const alive = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  return alive;
}

function useImageDraft(target: ImageTarget) {
  const [index, setIndex] = useState(target.selected);
  const image = imageDraft(target, index);
  const saved = settings(image);
  const [edits, setEdits] = useState<Partial<Settings>>({});
  const change = (edit: Partial<Settings>) => setEdits(previous => ({...previous, ...edit}));
  const [file, choose] = useState<File>();
  const suggestion = file && fileLabel(file.name);
  const draft = { ...saved, ...edits, alt: edits.alt ?? saved.alt ?? (suggestion || null) };
  const dirty = !!file || settingsChanged(draft, saved);
  const select = (next: number) => { setEdits({}); choose(undefined); setIndex(next); };
  const valid = validSize(draft.width.trim(), saved.width) && validSize(draft.cap.trim(), saved.cap);
  const validFile = file ? file.type.startsWith("image/") : Boolean(image.getAttribute("src"));
  return { image: applySettings(image, draft), draft, change, file, choose, valid, canApply: valid && validFile, dirty, index, select };
}

function ImageFileField({choose, index}: Readonly<{choose(file?: File): void; index: number}>) {
  const id = useId();
  return <div className="grid gap-2">
    <Label htmlFor={id}>{index < 0 ? "New image file" : "Replace image file"}</Label>
    <Input id={id} type="file" accept="image/*" onChange={e => choose(e.target.files?.[0])} />
  </div>;
}

function DraftEditor({target, close}: Readonly<Omit<EditorProps, "index">>) {
  const edit = useImageDraft(target);
  const { apply, busy, error } = useApplyImage({target, index: edit.index, close});
  const [removing, setRemoving] = useState(false);
  return <>
    <div className="grid min-h-0 gap-4 overflow-y-auto p-1">
      <fieldset className="grid min-w-0 gap-4" disabled={busy}>
        <ImageThumbnailPicker target={target} index={edit.index} select={edit.select} locked={edit.dirty || busy || removing} />
        {edit.index >= 0 && <RemovalControl staged={removing} disabled={edit.dirty} toggle={() => setRemoving(!removing)} />}
        {!removing && <DraftFields edit={edit} hasImages={target.images.length > 0} />}
      </fieldset>
      {!edit.valid && <p className="text-sm text-destructive" role="alert">Enter a positive size, or leave the field blank.</p>}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    </div>
    <ImageActions close={close} busy={busy} enabled={removing || edit.canApply}
      apply={() => apply(removing ? null : edit.image, edit.file)} />
  </>;
}

interface ActionProps { close(): void; apply(): void; busy: boolean; enabled: boolean }

function ImageActions({close, apply, busy, enabled}: Readonly<ActionProps>) {
  return <DialogFooter>
    <Button type="button" variant="secondary" onClick={close}>Cancel</Button>
    <Button type="button" disabled={busy || !enabled} onClick={apply}>{busy ? "Applying…" : "Apply"}</Button>
  </DialogFooter>;
}

function DraftFields({edit, hasImages}: Readonly<{edit: ReturnType<typeof useImageDraft>; hasImages: boolean}>) {
  return <>
    {edit.dirty && hasImages && <p role="status" className="text-sm text-muted-foreground">Apply or cancel these changes before editing another image.</p>}
    <ImageFileField key={edit.index} choose={edit.choose} index={edit.index} />
    <ImageFields draft={edit.draft} change={edit.change} />
  </>;
}

function RemovalControl({ staged, disabled, toggle }: Readonly<{ staged: boolean; disabled: boolean; toggle(): void }>) {
  const hint = useId();
  return <div className="grid gap-2">
    <Button type="button" variant="outline" size="sm" className="justify-self-start" disabled={disabled}
      aria-describedby={hint} onClick={toggle}>{staged ? "Keep image" : "Remove from this field"}</Button>
    <p id={hint} role={staged ? "status" : undefined} className="text-sm text-muted-foreground">
      {staged ? "Apply to remove this occurrence. The file and its other uses will stay intact." :
        "Removal affects only this occurrence, not the stored file or its other uses."}
    </p>
  </div>;
}

interface DialogProps { target: ImageTarget; close(): void; PreviewDisplay: ComponentType<{children: ReactNode}> }

export function ImageSettingsDialog({ target, close, PreviewDisplay }: Readonly<DialogProps>) {
  const [opener] = useState(() => document.activeElement);
  return <Dialog open onOpenChange={open => { if (!open) close(); }}>
    <DialogContent className="max-h-[90dvh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden" onOpenAutoFocus={focusApply} onCloseAutoFocus={event => {
      event.preventDefault();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({preventScroll:true});
    }}>
      <DialogHeader>
        <DialogTitle>{target.scope === "choice" ? "Choice image settings" : "Image settings"}</DialogTitle>
        <DialogDescription>Apply your changes to see the image in your survey.</DialogDescription>
      </DialogHeader>
      <PreviewDisplay><DraftEditor target={target} close={close} /></PreviewDisplay>
    </DialogContent>
  </Dialog>;
}

function focusApply(event: Event) {
  if (!(event.currentTarget instanceof HTMLElement)) return;
  const apply = event.currentTarget.querySelector<HTMLButtonElement>('button[data-variant="default"]:enabled');
  if (!apply) return;
  event.preventDefault();
  apply.focus();
}
