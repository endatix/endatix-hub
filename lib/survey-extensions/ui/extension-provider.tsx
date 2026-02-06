"use client";

import { createContext, use, useRef } from "react";
import {
  ExtensionRegistry,
  extensionRegistry,
} from "../infrastructure/extension-registry";
import { Extension } from "../types";

interface ExtensionContextValue {
  registry: ExtensionRegistry;
}

const ExtensionContext = createContext<ExtensionContextValue>({
  registry: extensionRegistry,
});

interface ExtensionProviderProps {
  extensions: Extension[];
  children: React.ReactNode;
}

export function ExtensionProvider({
  extensions,
  children,
}: ExtensionProviderProps) {
  const initializedRef = useRef(false);

  if (!initializedRef.current) {
    extensionRegistry.registerAll(extensions);
    extensionRegistry.initializeExtensions();
    initializedRef.current = true;
  }

  return (
    <ExtensionContext.Provider value={{ registry: extensionRegistry }}>
      {children}
    </ExtensionContext.Provider>
  );
}

/**
 * React hook that provides the survey extensions.
 * @returns The survey extension registry.
 */
export function useExtensions(): ExtensionRegistry {
  const context = use(ExtensionContext).registry;
  if (!context) {
    throw new Error("useExtensions must be used within an ExtensionProvider");
  }

  return context;
}
