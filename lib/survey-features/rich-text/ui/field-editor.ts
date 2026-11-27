import { Editor, Extension, type EditorOptions } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { BackgroundColor, Color, TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";

// The vendor drag command commits numeric dimensions. Imported HTML dimensions
// are strings: leave their authored responsive CSS alone until the first drag.
function renderedSize(attrs: Record<string, unknown>) {
  if (typeof attrs.width !== "number") return { style: attrs.style };
  const image = document.createElement("img");
  image.style.cssText = typeof attrs.style === "string" ? attrs.style : "";
  image.style.width = `${attrs.width}px`;
  image.style.height = "auto";
  image.style.maxWidth = "100%";
  return { style: image.style.cssText };
}

const fieldImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null, parseHTML: el => el.getAttribute("width") },
      style: { default: null, renderHTML: renderedSize },
      srcset: { default: null },
      class: { default: null },
      role: { default: null },
      "data-image-label": { default: null },
    };
  },
});

const fieldNavigation = Extension.create({
  name: "fieldNavigation",
  addKeyboardShortcuts() {
    return {
      Home: () => this.editor.commands.selectTextblockStart(),
      End: () => this.editor.commands.selectTextblockEnd(),
    };
  },
});

export function createFieldEditor(options: Partial<EditorOptions>) {
  return new Editor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false }, trailingNode: false }),
      TextStyle, Color, BackgroundColor, fieldNavigation,
      fieldImage.configure({ inline: true, allowBase64: true, resize: {
        enabled: options.editable !== false, directions: ["bottom-right"], alwaysPreserveAspectRatio: true,
      } }),
    ],
    parseOptions: { preserveWhitespace: "full" },
    editorProps: { transformPastedHTML: html => htmlSanitizer.sanitize(html, htmlSanitizer.presets.surveyHtml) },
    ...options,
  });
}
