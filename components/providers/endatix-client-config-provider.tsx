"use client";

import {
  EMPTY_CLIENT_ENDATIX_CONFIG,
  hydrateBrowserEndatixConfig,
  toClientEndatixConfig,
  type ClientEndatixConfig,
} from "@/features/config/client-endatix-config";
import { createContext, useContext, useMemo, type ReactNode } from "react";

const EndatixClientConfigContext = createContext<ClientEndatixConfig>(
  EMPTY_CLIENT_ENDATIX_CONFIG,
);

interface EndatixClientConfigProviderProps {
  value: ClientEndatixConfig;
  children: ReactNode;
}

/**
 * Root-level, referentially stable projection of request-time Endatix env.
 * Separate from theme/session so those updates do not rerender config consumers.
 */
export function EndatixClientConfigProvider({
  value,
  children,
}: Readonly<EndatixClientConfigProviderProps>) {
  const { apiBaseUrl, extensionsEnabled } = value;
  const stable = useMemo(
    () => toClientEndatixConfig({ apiBaseUrl, extensionsEnabled }),
    [apiBaseUrl, extensionsEnabled],
  );

  hydrateBrowserEndatixConfig(stable);

  return (
    <EndatixClientConfigContext.Provider value={stable}>
      {children}
    </EndatixClientConfigContext.Provider>
  );
}

export function useEndatixClientConfig(): ClientEndatixConfig {
  return useContext(EndatixClientConfigContext);
}
