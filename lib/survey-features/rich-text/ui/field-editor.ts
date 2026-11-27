import { Editor, type EditorOptions } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import { BackgroundColor, Color, TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import { htmlSanitizer } from "@/lib/utils/html-sanitizer";

const fieldImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null, parseHTML: el => el.getAttribute("width") },
      style: {
        default: null,
        renderHTML(attrs) {
          // The official drag command sets numeric dimensions. Old inline CSS
          // must not override the author's new width after Save and reopen.
          if (typeof attrs.width !== "number") return { style: attrs.style };
          const image = document.createElement("img");
          image.style.cssText = attrs.style ?? "";
          image.style.width = `${attrs.width}px`;
          image.style.height = "auto";
          image.style.maxWidth = "100%";
          return { style: image.style.cssText };
        },
      },
      srcset: { default: null },
      "data-image-label": { default: null },
    };
  },
});

export function createFieldEditor(options: Partial<EditorOptions>) {
  return new Editor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false }, trailingNode: false }),
      TextStyle, Color, BackgroundColor,
      fieldImage.configure({ inline: true, allowBase64: true, resize: {
        enabled: options.editable !== false, directions: ["bottom-right"], alwaysPreserveAspectRatio: true,
      } }),
    ],
    parseOptions: { preserveWhitespace: "full" },
    editorProps: { transformPastedHTML: html => htmlSanitizer.sanitize(html, htmlSanitizer.presets.surveyHtml) },
    ...options,
  });
}
