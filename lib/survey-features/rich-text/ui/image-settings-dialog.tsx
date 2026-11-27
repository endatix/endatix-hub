import { useContext, useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fileLabel, imageOption } from "./image-label";
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

function useLocalPreview(file?: File) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) return;
    const source = URL.createObjectURL(file);
    setUrl(source);
    return () => URL.revokeObjectURL(source);
  }, [file]);
  return file ? url : "";
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

interface EditorProps { target: ImageTarget; index: number; close(): void }

async function replaceSource(image: HTMLImageElement, store: StoreImage, file: File) {
  image.src = await store(file);
  image.removeAttribute("srcset");
}

function useApplyImage({target, index, close}: EditorProps) {
  const store = useContext(ImageUploadContext) ?? inlineImage;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useMounted();
  async function apply(image: HTMLImageElement, file?: File) {
    setBusy(true);
    try {
      if (file) await replaceSource(image, store, file);
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

function ImagePreview({ image, file }: Readonly<{ image: HTMLImageElement; file?: File }>) {
  const url = useLocalPreview(file) || image.getAttribute("src");
  const [narrow, setNarrow] = useState(false);
  const width = image.style.width || dimension(image.getAttribute("width") ?? "");
  const height = image.style.height || dimension(image.getAttribute("height") ?? "");
  const id = useId();
  return <section className="grid gap-2" aria-label="Image preview">
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-medium">Preview</span>
      <Label htmlFor={id}>Narrow preview <Switch id={id} checked={narrow} onCheckedChange={setNarrow} /></Label>
    </div>
    <div className="max-h-48 overflow-auto rounded-md border bg-muted/40 p-3">
      <div style={{ width: narrow ? 72 : "100%", maxWidth: "100%" }}>
        {url ? <img data-choice-image-preview="" src={url} alt={image.alt} style={{ width, height, maxWidth: image.style.maxWidth }} /> :
          <span className="text-sm text-muted-foreground">Choose a file to preview it here.</span>}
      </div>
    </div>
  </section>;
}

function useImageDraft({target, index}: EditorProps) {
  const image = imageDraft(target, index);
  const saved = settings(image);
  const [edits, setEdits] = useState(saved);
  const change = (edit: Partial<Settings>) => setEdits(previous => ({...previous, ...edit}));
  const [file, choose] = useState<File>();
  const suggestion = file && fileLabel(file.name);
  const draft = { ...edits, alt: edits.alt ?? (suggestion || null) };
  const valid = validSize(draft.width.trim(), saved.width) && validSize(draft.cap.trim(), saved.cap);
  const validFile = file ? file.type.startsWith("image/") : Boolean(image.getAttribute("src"));
  return { image: applySettings(image, draft), draft, change, file, choose, valid, validFile };
}

function DraftEditor(props: Readonly<EditorProps>) {
  const { draft, change, image, file, choose, valid, validFile } = useImageDraft(props);
  const { apply, busy, error } = useApplyImage(props);
  const id = useId();
  return <>
    <fieldset className="grid min-w-0 gap-4" disabled={busy}>
      <div className="grid gap-2"><Label htmlFor={id}>Image file</Label><Input id={id} type="file" accept="image/*" onChange={e => choose(e.target.files?.[0])} /></div>
      <ImageFields draft={draft} change={change} />
      <ImagePreview image={image} file={file}/>
    </fieldset>
    {!valid && <p className="text-sm text-destructive" role="alert">Enter a positive size, or leave the field blank.</p>}
    {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    <DialogFooter>
      <Button type="button" variant="secondary" onClick={props.close}>Cancel</Button>
      <Button type="button" disabled={busy || !valid || !validFile} onClick={() => apply(image, file)}>{busy ? "Applying…" : "Apply"}</Button>
    </DialogFooter>
  </>;
}

function ImagePicker({ target, index, select }: Readonly<{target: ImageTarget; index: number; select(index: number): void}>) {
  const id = useId();
  return <div className="grid min-w-0 gap-2">
    <Label htmlFor={id}>Image</Label>
    <Select value={String(index)} onValueChange={value => select(Number(value))}>
      <SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent><SelectGroup>
        <SelectItem value="-1">Add an image</SelectItem>
        {target.images.map((img, i) => <SelectItem key={i} value={String(i)}>{imageOption(img, i)}</SelectItem>)}
      </SelectGroup></SelectContent>
    </Select>
  </div>;
}

interface DialogProps { target: ImageTarget; close(): void; PreviewDisplay: ComponentType<{children: ReactNode}> }

export function ImageSettingsDialog({ target, close, PreviewDisplay }: Readonly<DialogProps>) {
  const [opener] = useState(() => document.activeElement);
  const [index, setIndex] = useState(target.selected);
  return <Dialog open onOpenChange={open => { if (!open) close(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto" onCloseAutoFocus={event => {
      event.preventDefault();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({preventScroll:true});
    }}>
      <DialogHeader>
        <DialogTitle>{target.scope === "choice" ? "Choice image settings" : "Image settings"}</DialogTitle>
        <DialogDescription>Choose an image to edit or add a new one.</DialogDescription>
      </DialogHeader>
      <ImagePicker target={target} index={index} select={setIndex} />
      <PreviewDisplay><DraftEditor key={index} index={index} target={target} close={close} /></PreviewDisplay>
    </DialogContent>
  </Dialog>;
}
