"use client";

import {
  hydrateBrowserEndatixConfig,
  toClientEndatixConfig,
  type ClientEndatixConfig,
} from "@/features/config/client-endatix-config";
import { createContext, useContext, useMemo, type ReactNode } from "react";

const EndatixConfigContext = createContext<ClientEndatixConfig | null>(null);

interface EndatixConfigProviderProps {
  value: ClientEndatixConfig;
  children: ReactNode;
}

/**
 * Root-level, referentially stable projection of request-time Endatix env.
 * Kept outside theme/session so those contexts do not subscribe config consumers.
 */
export function EndatixConfigProvider({
  value,
  children,
}: Readonly<EndatixConfigProviderProps>) {
  const { apiBaseUrl, extensionsEnabled } = value;
  const stable = useMemo(
    () => toClientEndatixConfig({ apiBaseUrl, extensionsEnabled }),
    [apiBaseUrl, extensionsEnabled],
  );

  hydrateBrowserEndatixConfig(stable);

  return (
    <EndatixConfigContext.Provider value={stable}>
      {children}
    </EndatixConfigContext.Provider>
  );
}

export function useEndatixConfig(): ClientEndatixConfig {
  const config = useContext(EndatixConfigContext);
  if (config === null) {
    throw new Error(
      "useEndatixConfig must be used within an EndatixConfigProvider.",
    );
  }
  return config;
}
