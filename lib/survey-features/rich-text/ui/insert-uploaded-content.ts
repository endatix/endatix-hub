import type { Editor, Range } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import { DOMParser } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";

interface Transfer {
  load(): Promise<HTMLTemplateElement>;
  signal: AbortSignal;
}

export async function insertUploadedContent(editor: Editor, range: Range, transfer: Transfer) {
  let placement = { from: range.from, to: range.to };
  let stale = false;
  const track = ({ transaction }: { transaction: Transaction }) => {
    if (transaction.getMeta("preventUpdate")) stale = true;
    const from = transaction.mapping.map(placement.from, 1);
    placement = { from, to: Math.max(from, transaction.mapping.map(placement.to, -1)) };
  };
  editor.on("transaction", track);
  try {
    const fragment = await transfer.load();
    if (stale || transfer.signal.aborted || editor.isDestroyed || !editor.isEditable) return;
    fragment.innerHTML = htmlSanitizer.sanitize(fragment.innerHTML, htmlSanitizer.presets.surveyHtml);
    const slice = DOMParser.fromSchema(editor.schema).parseSlice(fragment.content, { preserveWhitespace: true });
    editor.view.dispatch(closeHistory(editor.state.tr).replaceRange(placement.from, placement.to, slice));
    editor.view.dispatch(closeHistory(editor.state.tr));
  } finally {
    editor.off("transaction", track);
  }
}
