import { createContext } from "react";

export type StoreImage = (file: File) => Promise<string>;
export const ImageUploadContext = createContext<StoreImage | null>(null);
