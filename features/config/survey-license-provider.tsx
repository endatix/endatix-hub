"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * The SurveyJS Creator licence key, scoped to the routes that actually render Creator.
 *
 * Separate from `EndatixConfigProvider` on purpose. That projection is mounted by the
 * public layouts too, so anything added to it is serialised into the HTML of every
 * anonymous form page. The licence key is a commercial credential with no purpose in the
 * public form runtime.
 *
 * Mount it as close to the consumer as possible — a route segment, never a shared layout —
 * because everything below the provider carries the key in its RSC payload.
 */
const SurveyLicenseContext = createContext<string>("");

interface SurveyLicenseProviderProps {
  value: string;
  children: ReactNode;
}

/**
 * Provides {@link useSurveyLicenseKey} to a subtree. `value` comes from
 * `getSurveyLicenseKey()` in a Server Component.
 */
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

/**
 * The licence key for the current subtree.
 *
 * @returns the configured key, or an empty string when none is set or the caller is
 * rendered outside a {@link SurveyLicenseProvider}.
 */
export function useSurveyLicenseKey(): string {
  return useContext(SurveyLicenseContext);
}
