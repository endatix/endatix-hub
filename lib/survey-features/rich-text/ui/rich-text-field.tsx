import { useContext, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import type { Editor } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { SvgIcon } from "survey-react-ui";
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

function useFormattingOptions(editor?: Editor) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Tab") event.stopPropagation();
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
    const selection = editor.state.selection;
    if (event.key !== "Enter" || !(selection instanceof NodeSelection) || selection.node.type.name !== "image") return;
    const image = editor.view.nodeDOM(selection.from);
    if (!(image instanceof Element)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    open(fieldImageTarget(editor, scope, image.querySelector("img") ?? undefined));
  };
  root.addEventListener("click", click);
  root.addEventListener("keydown", key, true);
  return () => { root.removeEventListener("click", click); root.removeEventListener("keydown", key, true); };
}

function useSettings(editor: Editor | undefined, props: Readonly<Props>) {
  const open = useContext(OpenImageSettings);
  const scope = props.choiceLabel ? "choice" : "field";
  useLayoutEffect(() => {
    if (editor && !props.readOnly && open) return bindSettings(editor, scope, open);
  }, [editor, props.readOnly, scope, open]);
  if (!editor || props.readOnly || !open) return;
  return (image?: HTMLImageElement) => open(fieldImageTarget(editor, scope, image));
}

export function RichTextField(props: Readonly<Props>) {
  const { editor, host } = useFieldEditor(props);
  const { jobs, upload } = useImageTransfers(editor, props.choiceLabel);
  const settings = useSettings(editor, props);
  const { expanded, setExpanded, id, navigate } = useFormattingOptions(editor);
  return <div className="rich-text-controls" onKeyDownCapture={navigate}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false); }}>
    <div ref={host} className="rich-text-surface" />
    {!props.readOnly && <button type="button" className="rich-text-format-toggle" title="Formatting options"
      aria-label="Formatting options" aria-expanded={expanded} aria-controls={expanded ? id : undefined}
      onClick={event => { event.currentTarget.focus({ preventScroll: true }); setExpanded(!expanded); }}>A</button>}
    {expanded && editor && <FormattingToolbar id={id} editor={editor} upload={upload} />}
    {settings && !props.choiceLabel && <button type="button" className="rich-text-image-action"
      title="Image settings" aria-label="Image settings" onClick={() => settings()}><SvgIcon iconName="icon-image" size={20} /></button>}
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
