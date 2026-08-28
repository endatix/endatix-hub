"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * The SurveyJS Creator licence key, scoped to the authenticated application shell.
 *
 * Separate from `EndatixConfigProvider` on purpose. That projection is mounted by the
 * public layouts too, so anything added to it is serialised into the HTML of every
 * anonymous form page. The licence key is a commercial credential with no purpose in the
 * public form runtime, so it is provided only where the designer and preview surfaces live.
 */
const SurveyLicenseContext = createContext<string>("");

interface SurveyLicenseProviderProps {
  value: string;
  children: ReactNode;
}

export function SurveyLicenseProvider({
  value,
  children,
}: Readonly<SurveyLicenseProviderProps>) {
  return (
    <SurveyLicenseContext.Provider value={value}>
      {children}
    </SurveyLicenseContext.Provider>
  );
}

/** Empty string when no licence is configured, or outside the authenticated shell. */
export function useSurveyLicenseKey(): string {
  return useContext(SurveyLicenseContext);
}
