import { useContext, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ImageUploadContext, type StoreImage } from "./image-upload-context";
import { imageDraft, inlineImage, type ImageTarget } from "./image-settings-target";

type Settings = { alt: string; width: string; cap: string };

function settings(image: HTMLImageElement): Settings {
  return {
    alt: image.alt,
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
  if (draft.alt !== saved.alt) image.alt = draft.alt;
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

function ImageFields({ draft, change }: { draft: Settings; change: (draft: Settings) => void }) {
  return <>
    <label>Alt text<input value={draft.alt} onChange={e => change({ ...draft, alt: e.target.value })} /></label>
    <label>Width<input placeholder="Auto" value={draft.width} onChange={e => change({ ...draft, width: e.target.value })} /></label>
    <label>Maximum width<input placeholder="No cap" value={draft.cap} onChange={e => change({ ...draft, cap: e.target.value })} /></label>
    <small>Enter pixels or a CSS length. Height adjusts automatically when you resize.</small>
  </>;
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

function ImagePreview({ image, file }: { image: HTMLImageElement; file?: File }) {
  const url = useLocalPreview(file) || image.getAttribute("src");
  const [narrow, setNarrow] = useState(false);
  const width = image.style.width || dimension(image.getAttribute("width") ?? "");
  const height = image.style.height || dimension(image.getAttribute("height") ?? "");
  return <>
    <label><input type="checkbox" checked={narrow} onChange={e => setNarrow(e.target.checked)} /> Narrow preview</label>
    <div style={{ width: narrow ? 72 : "100%", maxWidth: "100%" }}>
      {url && <img data-choice-image-preview="" src={url} alt={image.alt} style={{ width, height, maxWidth: image.style.maxWidth }} />}
    </div>
  </>;
}

function useImageDraft({target, index}: EditorProps) {
  const image = imageDraft(target, index);
  const saved = settings(image);
  const [draft, change] = useState(saved);
  const [file, choose] = useState<File>();
  const valid = validSize(draft.width.trim(), saved.width) && validSize(draft.cap.trim(), saved.cap);
  const validFile = file ? file.type.startsWith("image/") : Boolean(image.getAttribute("src"));
  return { image: applySettings(image, draft), draft, change, file, choose, valid, validFile };
}

function DraftEditor(props: EditorProps) {
  const { draft, change, image, file, choose, valid, validFile } = useImageDraft(props);
  const { apply, busy, error } = useApplyImage(props);
  return <>
    <fieldset disabled={busy}>
      <label>Image file<input type="file" accept="image/*" onChange={e => choose(e.target.files?.[0])} /></label>
      <ImageFields draft={draft} change={change} />
      <ImagePreview image={image} file={file}/>
    </fieldset>
    {!valid && <p role="alert">Enter a positive size, or leave the field blank.</p>}
    {error && <p role="alert">{error}</p>}
    <div className="flex gap-3"><button type="button" disabled={busy || !valid || !validFile} onClick={() => apply(image, file)}>{busy ? "Applying…" : "Apply"}</button>
      <button type="button" onClick={props.close}>Cancel</button></div>
  </>;
}

function useModal() {
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current!;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  return ref;
}

export function ImageSettingsDialog({ target, close }: { target: ImageTarget; close(): void }) {
  const ref = useModal();
  const title = useId();
  const [index, select] = useState(target.selected);
  return <dialog ref={ref} aria-labelledby={title} onCancel={close} className="choice-image-dialog">
    <h2 id={title}>{target.scope === "choice" ? "Choice image settings" : "Image settings"}</h2>
    <label>Image<select value={index} onChange={e => select(Number(e.target.value))}>
      <option value="-1">Add an image</option>
      {target.images.map((img, i) => <option key={i} value={i}>Image {i + 1}{img.alt && `: ${img.alt}`}</option>)}
    </select></label>
    <DraftEditor key={index} index={index} target={target} close={close} />
  </dialog>;
}
