"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { useTrackEvent } from "@/features/analytics/posthog/client";

type ThemeChangeSource = "account_menu" | "theme_menu";

interface ThemeSwitcherProps {
  source: ThemeChangeSource;
}

const THEME_OPTIONS = {
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
} as const;

export function ThemeSwitcher({ source }: Readonly<ThemeSwitcherProps>) {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const { trackEvent } = useTrackEvent();
  const selectedTheme = theme ?? THEME_OPTIONS.LIGHT;

  const handleThemeChange = (nextTheme: string) => {
    setTheme(nextTheme);
    trackEvent("theme_changed", {
      theme: nextTheme,
      previous_theme: theme ?? null,
      resolved_theme: resolvedTheme ?? null,
      source,
    });
  };

  return (
    <DropdownMenuGroup>
      <DropdownMenuLabel>Theme</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={selectedTheme}
        onValueChange={handleThemeChange}
      >
        <DropdownMenuRadioItem value={THEME_OPTIONS.LIGHT}>
          <Sun />
          Light
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value={THEME_OPTIONS.DARK}>
          <Moon />
          Dark
        </DropdownMenuRadioItem>
        <DropdownMenuRadioItem value={THEME_OPTIONS.SYSTEM}>
          <Monitor />
          System
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuGroup>
  );
}
