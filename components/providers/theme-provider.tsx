"use client";

import * as React from "react";
import {
  ThemeProvider as NextThemesProvider,
  ThemeProviderProps,
  useTheme,
} from "next-themes";

type DefaultableThemeProviderProps = Partial<ThemeProviderProps> & {
  children: React.ReactNode;
};

const THEME_HOTKEY = "d";
const THEME_OPTIONS = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
} as const;

type ThemeOption = (typeof THEME_OPTIONS)[keyof typeof THEME_OPTIONS];

// next-themes renders an inline <script> to prevent theme flicker.
// React 19 warns about script tags inside components (https://github.com/shadcn-ui/ui/issues/10104)
// The warning is a false positive — the script runs correctly during SSR.
if (globalThis.window !== undefined && process.env.NODE_ENV === "development") {
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag")
    )
      return;
    orig.apply(console, args);
  };
}

/**
 * ThemeProvider component with Endatix default values
 * Wraps next-themes provider with sensible defaults
 */
function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = THEME_OPTIONS.LIGHT,
  enableSystem = true,
  disableTransitionOnChange,
  ...props
}: DefaultableThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      {...props}
    >
      <ThemeHotkey />
      {children}
    </NextThemesProvider>
  );
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  );
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme();

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return;
      }

      if (!event.key) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (event.key.toLowerCase() !== THEME_HOTKEY) {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      const nextTheme =
        resolvedTheme === THEME_OPTIONS.DARK
          ? THEME_OPTIONS.LIGHT
          : THEME_OPTIONS.DARK;

      setTheme(nextTheme);
    }

    if (!globalThis.window) {
      return;
    }

    globalThis.window.addEventListener("keydown", onKeyDown);

    return () => {
      globalThis.window.removeEventListener("keydown", onKeyDown);
    };
  }, [resolvedTheme, setTheme]);

  return null;
}

export { ThemeProvider };
