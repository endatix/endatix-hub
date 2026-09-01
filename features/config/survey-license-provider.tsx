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
 *
 * The default is `undefined`, not `""`, so the two ways a consumer can end up without a
 * key stay distinguishable:
 *
 * - `undefined` — no provider in the tree. A wiring bug: the route renders Creator or the
 *   Dashboard unlicensed and nothing says so. Warned about in development.
 * - `""` — provider mounted, no licence configured. Legitimate: an unlicensed deployment
 *   running Creator with its non-commercial banner. Silent by design.
 *
 * Collapsing both to `""` is what let the template editor ship unlicensed unnoticed.
 */
const SurveyLicenseContext = createContext<string | undefined>(undefined);

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
 * Warn once per process, not once per render: React re-renders and StrictMode's double
 * invocation would otherwise bury the message in repeats of itself.
 */
let hasWarnedAboutMissingProvider = false;

/** Exported for tests; resets the once-only latch above. */
export function resetSurveyLicenseWarningForTests(): void {
  hasWarnedAboutMissingProvider = false;
}

/**
 * The licence key for the current subtree.
 *
 * In development, warns when no {@link SurveyLicenseProvider} is mounted — the failure
 * mode this hook exists to make loud. A configured-but-empty key is not warned about: an
 * unlicensed deployment is a supported state, and warning about it would train everyone
 * to ignore the message that matters. The check compiles out of production bundles.
 *
 * @returns the configured key, or an empty string when none is set or no provider is
 * mounted.
 */
export function useSurveyLicenseKey(): string {
  const value = useContext(SurveyLicenseContext);

  if (process.env.NODE_ENV !== "production" && value === undefined) {
    if (!hasWarnedAboutMissingProvider) {
      hasWarnedAboutMissingProvider = true;
      console.warn(
        "[endatix] No <SurveyLicenseProvider> above this component, so SurveyJS is " +
          "running unlicensed here (Creator shows its non-commercial banner). Wrap the " +
          "route segment: `<SurveyLicenseProvider value={getSurveyLicenseKey()}>` — " +
          "import getSurveyLicenseKey from @/features/config/server in the Server " +
          "Component. Mount it on the route, not a shared layout: everything below the " +
          "provider carries the key in its RSC payload.",
      );
    }
  }

  return value ?? "";
}
