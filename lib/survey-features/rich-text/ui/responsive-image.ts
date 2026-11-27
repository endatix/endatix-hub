import Quill from "quill";
import ImageBlot from "quill/formats/image";

// Quill's stock image blot retains HTML attributes but drops inline sizing.
const dimensions = new Map<string, string>([
  ["imageWidth", "width"], ["imageCap", "max-width"], ["imageHeight", "height"],
]);

class ResponsiveImage extends ImageBlot {
  static formats(node: HTMLImageElement) {
    const formats = super.formats(node);
    for (const [format, property] of dimensions) {
      const value = node.style.getPropertyValue(property);
      if (value) formats[format] = value;
    }
    return formats;
  }

  format(name: string, value: string) {
    if (name === "alt" && value === "") {
      this.domNode.alt = "";
      return;
    }
    const property = dimensions.get(name);
    if (property) this.domNode.style.setProperty(property, value || "");
    else super.format(name, value);
  }
}

Quill.register("formats/image", ResponsiveImage, true);
