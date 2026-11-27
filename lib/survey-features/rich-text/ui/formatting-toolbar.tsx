import { useCallback, useEffect, useRef, useState } from "react";
import type Quill from "quill";
import { Bold, Italic, Underline, Strikethrough, ImagePlus, RotateCcw, Baseline, Highlighter } from "lucide-react";

const marks = [
  { name: "bold", label: "Bold", Icon: Bold },
  { name: "italic", label: "Italic", Icon: Italic },
  { name: "underline", label: "Underline", Icon: Underline },
  { name: "strike", label: "Strikethrough", Icon: Strikethrough },
];

function useFormatting(editor: Quill) {
  const read = useCallback(() => editor.getFormat(editor.selection.savedRange), [editor]);
  const [formats, setFormats] = useState(read);
  useEffect(() => {
    const update = () => setFormats(read());
    editor.on("editor-change", update);
    return () => { editor.off("editor-change", update); };
  }, [editor, read]);
  function apply(name: string, value: string | boolean) {
    editor.focus({ preventScroll: true });
    editor.format(name, value, "user");
    setFormats(read());
  }
  return { formats, apply };
}

type Formatting = ReturnType<typeof useFormatting>;

function MarkButtons({ formats, apply }: Formatting) {
  return <span role="group" aria-label="Text style">{marks.map(({ name, label, Icon }) =>
    <button key={name} type="button" aria-label={label} title={label}
      aria-pressed={Boolean(formats[name])} onClick={() => apply(name, !formats[name])}><Icon size={16} /></button>
  )}</span>;
}

function ColorControl({ formats, apply, name }: Formatting & { name: "color" | "background" }) {
  const label = name === "color" ? "Text color" : "Highlight";
  const defaultColor = name === "color" ? "#000000" : "#ffffff";
  const value = formats[name];
  const Icon = name === "color" ? Baseline : Highlighter;
  return <span role="group" aria-label={label}>
    <label className="rich-text-color" title={label}><Icon size={15} aria-hidden />
      <input type="color" aria-label={label}
      value={typeof value === "string" ? value : defaultColor}
      onChange={event => apply(name, event.target.value)} /></label>
    {Boolean(value) && <button type="button" aria-label={`Reset ${label.toLowerCase()}`} title={`Reset ${label.toLowerCase()}`}
      onClick={() => apply(name, false)}><RotateCcw size={14} /></button>}
  </span>;
}

function InsertImage({ editor }: { editor: Quill }) {
  const input = useRef<HTMLInputElement>(null);
  return <span role="group" aria-label="Media">
    <button type="button" aria-label="Insert image" title="Insert image" onClick={() => input.current?.click()}>
      <ImagePlus size={16} />
    </button>
    <input ref={input} type="file" accept="image/*" hidden onChange={event => {
      const files = event.target.files;
      if (files?.length) editor.uploader.upload(editor.getSelection(true), files);
      event.target.value = "";
    }} />
  </span>;
}

export function FormattingToolbar({ editor, id, openSettings }: { editor: Quill; id: string; openSettings?: () => void }) {
  const formatting = useFormatting(editor);
  return <div id={id} className="rich-text-formatting-commands">
    <MarkButtons {...formatting} />
    <ColorControl {...formatting} name="color" />
    <ColorControl {...formatting} name="background" />
    {openSettings
      ? <button type="button" aria-label="Image settings" title="Image settings" onClick={openSettings}><ImagePlus size={16} /></button>
      : <InsertImage editor={editor} />}
  </div>;
}
