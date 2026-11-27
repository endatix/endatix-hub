import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/core";
import { Bold, Italic, Underline, Strikethrough, ImagePlus, RotateCcw } from "lucide-react";

const marks = [
  { name: "bold", label: "Bold", Icon: Bold },
  { name: "italic", label: "Italic", Icon: Italic },
  { name: "underline", label: "Underline", Icon: Underline },
  { name: "strike", label: "Strikethrough", Icon: Strikethrough },
];

function selectedFormats(editor: Editor): Record<string, string | boolean> {
  return {
    ...Object.fromEntries(marks.map(({name}) => [name, editor.isActive(name)])),
    color: editor.getAttributes("textStyle").color,
    background: editor.getAttributes("textStyle").backgroundColor,
  };
}

function useFormatting(editor: Editor) {
  const read = useCallback(() => selectedFormats(editor), [editor]);
  const [formats, setFormats] = useState(read);
  useEffect(() => {
    const update = () => setFormats(read());
    editor.on("transaction", update);
    return () => { editor.off("transaction", update); };
  }, [editor, read]);
  function apply(name: string, value: string | boolean) {
    const chain = editor.chain();
    if (name === "color") (typeof value === "string" ? chain.setColor(value) : chain.unsetColor()).run();
    else if (name === "background") (typeof value === "string" ? chain.setBackgroundColor(value) : chain.unsetBackgroundColor()).run();
    else chain.toggleMark(name).run();
    editor.view.focus();
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
  return <span role="group" aria-label={label}>
    <label title={label}>{label}<input type="color" aria-label={label}
      value={typeof value === "string" ? value : defaultColor}
      onChange={event => apply(name, event.target.value)} /></label>
    <button type="button" aria-label={`Reset ${label.toLowerCase()}`} title={`Reset ${label.toLowerCase()}`}
      disabled={!value} onClick={() => apply(name, false)}><RotateCcw size={14} /></button>
  </span>;
}

type Upload = (files: FileList) => void;

function InsertImage({ upload }: Readonly<{ upload: Upload }>) {
  const input = useRef<HTMLInputElement>(null);
  return <span role="group" aria-label="Media">
    <button type="button" aria-label="Insert image" title="Insert image" onClick={() => input.current?.click()}>
      <ImagePlus size={16} />
    </button>
    <input ref={input} type="file" accept="image/*" hidden onChange={event => {
      const files = event.target.files;
      if (files?.length) upload(files);
      event.target.value = "";
    }} />
  </span>;
}

export function FormattingToolbar({ editor, id, upload }: Readonly<{ editor: Editor; id: string; upload: Upload }>) {
  const formatting = useFormatting(editor);
  return <div id={id} role="toolbar" aria-label="Text formatting" className="rich-text-formatting">
    <MarkButtons {...formatting} />
    <ColorControl {...formatting} name="color" />
    <ColorControl {...formatting} name="background" />
    <InsertImage upload={upload} />
  </div>;
}
