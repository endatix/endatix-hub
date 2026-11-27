import { createContext } from "react";

export interface ImageTarget {
  scope: "choice" | "field";
  images: HTMLImageElement[];
  selected: number;
  /** A null replacement removes only the occurrence at index. */
  commit(index: number, image: HTMLImageElement | null): boolean;
}

export const OpenImageSettings = createContext<((target: ImageTarget) => void) | null>(null);

export function imageDraft(target: ImageTarget, index: number) {
  const original = target.images[index];
  if (original) return original.cloneNode(false) as HTMLImageElement;
  const image = document.createElement("img");
  if (target.scope === "choice") {
    image.style.maxWidth = "min(100%, 100px)";
    image.style.height = "auto";
  }
  return image;
}

export function inlineImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
