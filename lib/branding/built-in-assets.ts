import { getPublicAssetPath } from "@/lib/hosting";

const asset = (file: string) => getPublicAssetPath(`/assets/${file}`);

export const BUILT_IN_NAME = "Endatix Hub";

/** The built-in Endatix files. `mark` and `wordmark` are the sidebar's two halves of `logo`. */
export const BUILT_IN_ASSETS = {
  logo: {
    light: asset("icons/endatix-logo-wordmark-blue.svg"),
    dark: asset("icons/endatix-logo-wordmark-white.svg"),
  },
  icon: asset("icons/icon.svg"),
  ogImage: asset("endatix-og-image.jpg"),
  mark: {
    light: asset("icons/endatix-paperclip-icon-blue.svg"),
    dark: asset("icons/endatix-paperclip-icon-white.svg"),
  },
  wordmark: {
    light: asset("icons/endatix-wordmark-blue.svg"),
    dark: asset("icons/endatix-wordmark-white.svg"),
  },
} as const;
