/**
 * Feature switches for `AppProvider`.
 *
 * Deliberately **not** in `app-provider.tsx`: that module is `"use client"`, and a server
 * layout importing a plain value from a client module receives a client reference, not
 * the object. `options={AppOptions.PublicPages}` then arrived as a stub, AppProvider fell
 * back to its all-on defaults, and every public page mounted the Hub theme provider,
 * session and sidebar — next-themes painting `color-scheme` from the Hub's stored theme
 * onto share and embed pages. Keep values that server layouts pass in here.
 */
export interface AppProviderOptions {
  enableTheme?: boolean;
  enableAnalytics?: boolean;
  enableSession?: boolean;
  enableToaster?: boolean;
  enableSidebar?: boolean;
}

export const AppOptions = {
  /** Anonymous public routes: analytics only. Colour scheme is the page's own business. */
  PublicPages: {
    enableTheme: false,
    enableAnalytics: true,
    enableSession: false,
    enableToaster: false,
    enableSidebar: false,
  },
  /** Standalone status routes (maintenance, export error): nothing but the config. */
  StatusPages: {
    enableTheme: false,
    enableAnalytics: false,
    enableSession: false,
    enableToaster: false,
    enableSidebar: false,
  },
} as const satisfies Record<string, AppProviderOptions>;
