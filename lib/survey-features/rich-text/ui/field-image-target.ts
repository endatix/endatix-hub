import type { Editor } from "@tiptap/core";
import { closeHistory } from "@tiptap/pm/history";
import type { ImageTarget } from "./image-settings-target";

function imagePositions(editor: Editor) {
  const positions: number[] = [];
  editor.state.doc.descendants((node, pos) => { if (node.type.name === "image") positions.push(pos); });
  return positions;
}

export function fieldImageTarget(editor: Editor, scope: ImageTarget["scope"], selected?: HTMLImageElement): ImageTarget {
  const doc = editor.state.doc;
  const positions = imagePositions(editor);
  const template = document.createElement("template");
  template.innerHTML = editor.getHTML();
  const images = Array.from(template.content.querySelectorAll("img"));
  const visible = Array.from(editor.view.dom.querySelectorAll<HTMLImageElement>("img[src]"));
  const insertion = editor.state.selection.from;
  function commit(index: number, image: HTMLImageElement | null) {
    if (editor.isDestroyed || !editor.isEditable || editor.state.doc !== doc) return false;
    const pos = positions[index] ?? insertion;
    const to = pos + (positions[index] === undefined ? 0 : 1);
    const chain = editor.chain().command(({ tr }) => Boolean(closeHistory(tr)));
    if (!image) return chain.deleteRange({ from: pos, to }).run();
    if (index === -1) return chain.insertContentAt(pos, image.outerHTML).run();
    const attrs = Object.fromEntries(Array.from(image.attributes, attr => [attr.name, attr.value]));
    return chain.command(({ tr }) => Boolean(tr.setNodeMarkup(pos, undefined, attrs))).run();
  }
  return { scope, images, selected: visible.indexOf(selected ?? visible[0]), commit };
}
