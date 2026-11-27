import { useContext, useLayoutEffect, useState, type RefObject } from "react";
import ReactQuill from "react-quill-new";
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

function ImageSettingsButton({ editorRef, bounds }: Pick<Props, "editorRef" | "bounds">) {
  const open = useContext(OpenImageSettings);
  useLayoutEffect(() => {
    const editor = editorRef.current?.getEditor();
    if (!editor || !open) return;
    const click = (event: MouseEvent) => {
      if (event.target instanceof HTMLImageElement) open(quillImageTarget(editor, event.target));
    };
    editor.root.addEventListener("click", click);
    return () => editor.root.removeEventListener("click", click);
  }, [open, editorRef, bounds]);
  if (!open) return null;
  return <button type="button" onClick={() => {
    const editor = editorRef.current?.getEditor();
    if (editor) open(quillImageTarget(editor));
  }}>Image settings</button>;
}

export function UploadableQuill({ editorRef, choiceLabel, ...props }: Props) {
  const jobs = useTransfers({ editorRef, choiceLabel, bounds: props.bounds });
  return (
    <>
      <ReactQuill {...props} ref={editorRef} />
      {choiceLabel && !props.readOnly && <ImageSettingsButton editorRef={editorRef} bounds={props.bounds} />}
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
