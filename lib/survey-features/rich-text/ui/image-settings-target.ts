import { createContext } from "react";

export interface ImageTarget {
  images: HTMLImageElement[];
  selected: number;
  commit(index: number, image: HTMLImageElement): boolean;
}

export const OpenImageSettings = createContext<((target: ImageTarget) => void) | null>(null);

export function newChoiceImage() {
  const image = document.createElement("img");
  image.style.maxWidth = "min(100%, 100px)";
  image.style.height = "auto";
  return image;
}

export function imageDraft(target: ImageTarget, index: number) {
  const original = target.images[index];
  return original ? original.cloneNode(false) as HTMLImageElement : newChoiceImage();
}

export function inlineImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}
