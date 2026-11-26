import { useContext, useLayoutEffect, useState, type RefObject } from "react";
import ReactQuill from "react-quill-new";
import { ImageUploadContext } from "./image-upload-context";
import {
  bindImageTransfers,
  type ImageTransfer,
} from "./quill-image-transfers";

export function UploadableQuill({
  editorRef,
  ...props
}: ReactQuill.ReactQuillProps & {
  editorRef: RefObject<ReactQuill | null>;
}) {
  const store = useContext(ImageUploadContext);
  const [jobs, setJobs] = useState<ImageTransfer[]>([]);
  useLayoutEffect(() => {
    const editor = editorRef.current?.getEditor();
    if (store && editor) return bindImageTransfers(editor, store, setJobs);
  }, [store, editorRef, props.bounds]);
  return (
    <>
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
