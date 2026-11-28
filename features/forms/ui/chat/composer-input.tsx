"use client";

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from "react";

type Input = [string, Dispatch<SetStateAction<string>>];
const ComposerInput = createContext<Input | null>(null);

/** Mounted at the designer's tenant/user/form boundary, outside canvas revisions. */
export function EditorComposerProvider({ children }: { children: ReactNode }) {
  const input = useState("");
  return <ComposerInput.Provider value={input}>{children}</ComposerInput.Provider>;
}

export function useComposerInput(): Input {
  const editor = useContext(ComposerInput);
  const standalone = useState("");
  return editor ?? standalone;
}
