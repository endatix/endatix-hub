import { useContext, useLayoutEffect, useState, type RefObject } from "react";
import ReactQuill from "react-quill-new";
import { SvgIcon } from "survey-react-ui";
import { ImageUploadContext } from "./image-upload-context";
import { OpenImageSettings, inlineImage } from "./image-settings-target";
import { quillImageTarget } from "./quill-image-target";
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
    if (!editor || (!store && !choiceLabel)) return;
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

export function UploadableQuill({ editorRef, choiceLabel, ...props }: Props) {
  const jobs = useTransfers({ editorRef, choiceLabel, bounds: props.bounds });
  const openSettings = useImageSettings({ editorRef, choiceLabel, bounds: props.bounds, readOnly: props.readOnly });
  return (
    <>
      {openSettings && <button type="button" className="rich-text-image-action" title="Image settings" aria-label="Image settings" onClick={openSettings}>
        <SvgIcon iconName="icon-image" size={20} />
      </button>}
      <ReactQuill {...props} ref={editorRef} />
      {jobs.map(job => <TransferStatus key={job.id} job={job} />)}
    </>
  );
}

function TransferStatus({ job }: { job: ImageTransfer }) {
  return <div role="status" className="flex flex-wrap items-center gap-x-2 text-sm">
    <span>{job.retry ? "Image upload failed." : "Uploading image…"}</span>
    {job.retry && <button className="underline" type="button" onClick={job.retry}>Retry</button>}
    <button className="underline" type="button" onClick={job.cancel}>Cancel</button>
  </div>;
}
