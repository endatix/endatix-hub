import { useContext, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import type { Editor } from "@tiptap/core";
import { NodeSelection, TextSelection } from "@tiptap/pm/state";
import { X } from "lucide-react";
import { ImageUploadContext } from "./image-upload-context";
import { OpenImageSettings, inlineImage } from "./image-settings-target";
import { fieldImageTarget } from "./field-image-target";
import { FormattingToolbar } from "./formatting-toolbar";
import { bindImageTransfers, type ImageTransfer } from "./image-transfers";
import { createFieldEditor } from "./field-editor";
import { FieldSource } from "./field-source";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";

interface Props {
  value?: string;
  onChange?(html: string): void;
  readOnly?: boolean;
  choiceLabel?: boolean;
}

function useFieldEditor({ value = "", readOnly, onChange }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const source = useRef(new FieldSource(value));
  const latest = useRef(onChange);
  latest.current = onChange;
  const [editor, setEditor] = useState<Editor>();
  useLayoutEffect(() => {
    if (!host.current) return;
    const field = createFieldEditor({
      element: host.current, editable: !readOnly, content: htmlSanitizer.sanitize(source.current.value, htmlSanitizer.presets.surveyHtml),
      onUpdate: ({ editor, transaction }) => latest.current?.(source.current.update(editor, transaction)),
    });
    setEditor(field);
    return () => { field.destroy(); };
  }, [readOnly]);
  useExternalValue(editor, source, value);
  return { host, editor };
}

function useExternalValue(editor: Editor | undefined, source: RefObject<FieldSource>, value: string) {
  useLayoutEffect(() => {
    if (!editor || editor.isDestroyed || value === source.current.value) return;
    source.current = new FieldSource(value);
    editor.commands.setContent(htmlSanitizer.sanitize(value, htmlSanitizer.presets.surveyHtml), { emitUpdate: false });
  }, [value, editor, source]);
}

function useImageTransfers(editor?: Editor, choiceLabel = false) {
  const store = useContext(ImageUploadContext);
  const [jobs, setJobs] = useState<ImageTransfer[]>([]);
  const transfers = useRef<ReturnType<typeof bindImageTransfers>>(null);
  useLayoutEffect(() => {
    if (!editor) return;
    const inputs = bindImageTransfers(editor, store ?? inlineImage, { publish: setJobs, choiceLabel });
    transfers.current = inputs;
    return () => { inputs.dispose(); transfers.current = null; };
  }, [editor, store, choiceLabel]);
  return { jobs, upload: (files: FileList) => editor && transfers.current?.upload(editor.state.selection, files) };
}

// A final Shift+Arrow selectionchange can arrive after Tab or pointer focus
// leaves the editing surface. Capture the browser selection before that move.
function rememberSelection(editor?: Editor) {
  if (!editor || !(editor.state.selection instanceof TextSelection)) return;
  const root = editor.view.dom;
  const selection = root.ownerDocument.getSelection();
  if (!selection?.anchorNode || !selection.focusNode ||
    !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return;
  const anchor = editor.view.posAtDOM(selection.anchorNode, selection.anchorOffset);
  const head = editor.view.posAtDOM(selection.focusNode, selection.focusOffset);
  const range = TextSelection.between(editor.state.doc.resolve(anchor), editor.state.doc.resolve(head));
  if (!range.eq(editor.state.selection)) editor.view.dispatch(editor.state.tr.setSelection(range));
}

function useFormattingOptions(editor?: Editor) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Tab") {
      rememberSelection(editor);
      event.stopPropagation();
    }
    if (expanded && event.key === "Escape") {
      event.stopPropagation();
      setExpanded(false);
      editor?.view.focus();
    }
  }
  return { expanded, setExpanded, id, navigate };
}

function bindSettings(editor: Editor, scope: "choice" | "field", open: NonNullable<React.ContextType<typeof OpenImageSettings>>) {
  const root = editor.view.dom;
  const click = (event: MouseEvent) => {
    if (event.target instanceof HTMLImageElement && event.target.hasAttribute("src")) open(fieldImageTarget(editor, scope, event.target));
  };
  const key = (event: globalThis.KeyboardEvent) => {
    if (event.key !== "Enter") return;
    const image = selectedImage(editor);
    if (!image) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(fieldImageTarget(editor, scope, image));
  };
  root.addEventListener("click", click);
  root.addEventListener("keydown", key, true);
  return () => { root.removeEventListener("click", click); root.removeEventListener("keydown", key, true); };
}

function selectedImage(editor: Editor) {
  const selection = editor.state.selection;
  if (!(selection instanceof NodeSelection)) return;
  const node = editor.view.nodeDOM(selection.from);
  if (node instanceof Element) return node.querySelector<HTMLImageElement>("img[src]") ?? undefined;
}

function useSettings(editor: Editor | undefined, props: Readonly<Props>) {
  const open = useContext(OpenImageSettings);
  const scope = props.choiceLabel ? "choice" : "field";
  useLayoutEffect(() => {
    if (editor && !props.readOnly && open) return bindSettings(editor, scope, open);
  }, [editor, props.readOnly, scope, open]);
  if (!editor || props.readOnly || !open) return;
  return () => {
    editor.view.focus();
    open(fieldImageTarget(editor, scope, selectedImage(editor)));
  };
}

type OptionsProps = {
  options: ReturnType<typeof useFormattingOptions>;
  editor?: Editor;
  upload: (files: FileList) => void;
  openSettings?: () => void;
};

function FormattingOptions({ options, editor, upload, openSettings }: Readonly<OptionsProps>) {
  const { expanded, setExpanded, id } = options;
  const label = expanded ? "Close formatting options" : "Formatting options";
  return <div role={expanded ? "toolbar" : undefined} aria-label={expanded ? "Text formatting" : undefined}
    className={expanded ? "rich-text-formatting" : "rich-text-trigger"}>
    <button type="button" className="rich-text-format-toggle" title={label}
      aria-label={label} aria-expanded={expanded} aria-controls={expanded ? id : undefined}
      onPointerDown={() => rememberSelection(editor)}
      onClick={event => {
        if (expanded) editor?.view.focus();
        else event.currentTarget.focus({ preventScroll: true });
        setExpanded(!expanded);
      }}>{expanded ? <X size={14} /> : <u>A</u>}</button>
    {expanded && editor && <FormattingToolbar id={id} editor={editor} upload={upload} openSettings={openSettings} />}
  </div>;
}

export function RichTextField(props: Readonly<Props>) {
  const { editor, host } = useFieldEditor(props);
  const { jobs, upload } = useImageTransfers(editor, props.choiceLabel);
  const settings = useSettings(editor, props);
  const options = useFormattingOptions(editor);
  return <div className="rich-text-controls" onKeyDownCapture={options.navigate}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) options.setExpanded(false); }}>
    <div ref={host} className="rich-text-surface" />
    {!props.readOnly && <FormattingOptions editor={editor} options={options} upload={upload} openSettings={settings} />}
    {jobs.map(job => <TransferStatus key={job.id} job={job} />)}
  </div>;
}

function TransferStatus({ job }: Readonly<{ job: ImageTransfer }>) {
  return <output className="flex flex-wrap items-center gap-x-2 text-sm">
    <span>{job.retry ? "Image upload failed." : "Uploading image…"}</span>
    {job.retry && <button className="underline" type="button" onClick={job.retry}>Retry</button>}
    <button className="underline" type="button" onClick={job.cancel}>Cancel</button>
  </output>;
}
