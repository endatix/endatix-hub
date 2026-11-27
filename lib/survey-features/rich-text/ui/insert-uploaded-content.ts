import { Delta, type default as Quill, type Range } from "quill";

interface Transfer {
  load(): Promise<Delta>;
  signal: AbortSignal;
}

/** Rebase the pending user edit over typing, deletion or undo during the PUT. */
export async function insertUploadedContent(
  editor: Quill,
  range: Range,
  transfer: Transfer,
) {
  let edits = new Delta();
  const track = (delta: Delta) => {
    edits = edits.compose(delta);
  };
  editor.on("text-change", track);
  try {
    const content = await transfer.load();
    if (transfer.signal.aborted || !editor.isEnabled()) return;
    commitInsertion(editor, range, { content, edits });
  } finally {
    editor.off("text-change", track);
  }
}

function commitInsertion(editor: Quill, range: Range, pending: { content: Delta; edits: Delta }) {
  const { content, edits } = pending;
  const insertion = new Delta().retain(range.index).delete(range.length).concat(content);
  const selection = editor.getSelection();
  const start = edits.transformPosition(range.index);
  editor.history.cutoff();
  editor.updateContents(edits.transform(insertion, true), "user");
  editor.history.cutoff();
  if (selection?.index === start && selection.length === range.length) {
    editor.setSelection(start + content.length(), 0, "silent");
  }
}
