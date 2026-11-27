import { useContext, useId, useLayoutEffect, useState, type RefObject, type KeyboardEvent } from "react";
import ReactQuill from "react-quill-new";
import { SvgIcon } from "survey-react-ui";
import { ImageUploadContext } from "./image-upload-context";
import { OpenImageSettings, inlineImage } from "./image-settings-target";
import { quillImageTarget } from "./quill-image-target";
import { FormattingToolbar } from "./formatting-toolbar";
import {
  bindImageTransfers,
  type ImageTransfer,
} from "./quill-image-transfers";

interface Props extends ReactQuill.ReactQuillProps {
  editorRef: RefObject<ReactQuill | null>;
  choiceLabel?: boolean;
}

function useTransfers({ editorRef, choiceLabel = false, bounds }: Props) {
  const store = useContext(ImageUploadContext);
  const [jobs, setJobs] = useState<ImageTransfer[]>([]);
  useLayoutEffect(() => {
    const editor = editorRef.current?.getEditor();
    if (!editor) return;
    return bindImageTransfers(editor, store ?? inlineImage, { publish: setJobs, choiceLabel });
  }, [store, choiceLabel, editorRef, bounds]);
  return jobs;
}

function useImageSettings({ editorRef, choiceLabel, bounds, readOnly }: Props) {
  const open = useContext(OpenImageSettings);
  useLayoutEffect(() => {
    const editor = editorRef.current?.getEditor();
    if (!editor || !open || readOnly) return;
    const click = (event: MouseEvent) => {
      if (event.target instanceof HTMLImageElement) {
        open(quillImageTarget(editor, event.target, choiceLabel ? "choice" : "field"));
      }
    };
    editor.root.addEventListener("click", click);
    return () => editor.root.removeEventListener("click", click);
  }, [open, editorRef, choiceLabel, bounds, readOnly]);
  if (!open || choiceLabel || readOnly) return;
  return () => {
    const editor = editorRef.current?.getEditor();
    if (editor) open(quillImageTarget(editor));
  };
}

function useFormattingOptions(editorRef: Props["editorRef"]) {
  const [expanded, setExpanded] = useState(false);
  const toolbarId = useId();
  function navigate(event: KeyboardEvent<HTMLDivElement>) {
    // Quill's Tab binding inserts a character; leave traversal to the browser.
    if (event.key === "Tab") event.stopPropagation();
    if (expanded && event.key === "Escape") {
      event.stopPropagation();
      setExpanded(false);
      editorRef.current?.editor?.focus({ preventScroll: true });
    }
  }
  return { expanded, setExpanded, toolbarId, navigate };
}

function FormattingOptions({ editorRef, options }: { editorRef: Props["editorRef"]; options: ReturnType<typeof useFormattingOptions> }) {
  const { expanded, setExpanded, toolbarId } = options;
  const editor = editorRef.current?.editor;
  return <>
    <button type="button" className="rich-text-format-toggle" title="Formatting options"
      aria-label="Formatting options" aria-expanded={expanded} aria-controls={expanded ? toolbarId : undefined}
      onClick={event => {
        event.currentTarget.focus({ preventScroll: true });
        setExpanded(!expanded);
      }}>A</button>
    {expanded && editor && <FormattingToolbar id={toolbarId} editor={editor} />}
  </>;
}

export function UploadableQuill({ editorRef, choiceLabel, ...props }: Props) {
  const jobs = useTransfers({ editorRef, choiceLabel, bounds: props.bounds });
  const openSettings = useImageSettings({ editorRef, choiceLabel, bounds: props.bounds, readOnly: props.readOnly });
  const options = useFormattingOptions(editorRef);
  return (
    <div className="rich-text-controls" onKeyDownCapture={options.navigate}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) options.setExpanded(false); }}>
      <ReactQuill {...props} theme="default" modules={editorModules} ref={editorRef} />
      {!props.readOnly && <FormattingOptions editorRef={editorRef} options={options} />}
      {openSettings && <button type="button" className="rich-text-image-action" title="Image settings" aria-label="Image settings" onClick={openSettings}>
        <SvgIcon iconName="icon-image" size={20} />
      </button>}
      {jobs.map(job => <TransferStatus key={job.id} job={job} />)}
    </div>
  );
}

const editorModules = { toolbar: false };

function TransferStatus({ job }: { job: ImageTransfer }) {
  return <div role="status" className="flex flex-wrap items-center gap-x-2 text-sm">
    <span>{job.retry ? "Image upload failed." : "Uploading image…"}</span>
    {job.retry && <button className="underline" type="button" onClick={job.retry}>Retry</button>}
    <button className="underline" type="button" onClick={job.cancel}>Cancel</button>
  </div>;
}
