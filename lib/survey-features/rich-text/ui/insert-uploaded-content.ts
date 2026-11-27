import type { Editor, Range } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import { DOMParser } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import type { StepMap } from "@tiptap/pm/transform";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";

interface Transfer {
  load(): Promise<HTMLTemplateElement>;
  signal: AbortSignal;
}

// Only delete text that was selected at paste time. Typing inside a pending
// replacement splits that selection into two surviving pieces.
function survivingRanges(range: Range, map: StepMap) {
  const ranges: Range[] = [];
  let start = range.from;
  function keep(end: number) {
    if (start < end) ranges.push({ from: map.mapResult(start, 1).pos, to: map.mapResult(end, -1).pos });
  }
  map.forEach((from, to) => {
    if (from >= range.to || to <= start) return;
    keep(from);
    start = Math.max(start, to);
  });
  keep(range.to);
  return ranges;
}

function trackInsertion(range: Range) {
  let anchor = range.from;
  let selected = [range];
  let stale = false;
  const track = ({ transaction }: { transaction: Transaction }) => {
    if (transaction.getMeta("preventUpdate")) stale = true;
    for (const map of transaction.mapping.maps) {
      anchor = map.mapResult(anchor, 1).pos;
      selected = selected.flatMap(part => survivingRanges(part, map));
    }
  };
  return { track, get placement() { return { anchor, selected, stale }; } };
}

export async function insertUploadedContent(editor: Editor, range: Range, transfer: Transfer) {
  const pending = trackInsertion(range);
  editor.on("transaction", pending.track);
  try {
    const fragment = await transfer.load();
    const { anchor, selected, stale } = pending.placement;
    if (stale || transfer.signal.aborted || editor.isDestroyed || !editor.isEditable) return;
    fragment.innerHTML = htmlSanitizer.sanitize(fragment.innerHTML, htmlSanitizer.presets.surveyHtml);
    const slice = DOMParser.fromSchema(editor.schema).parseSlice(fragment.content, { preserveWhitespace: true });
    const tr = closeHistory(editor.state.tr);
    for (const part of selected.toReversed()) tr.delete(part.from, part.to);
    const insertAt = tr.mapping.mapResult(anchor).pos;
    editor.view.dispatch(tr.replaceRange(insertAt, insertAt, slice));
    editor.view.dispatch(closeHistory(editor.state.tr));
  } finally {
    editor.off("transaction", pending.track);
  }
}
