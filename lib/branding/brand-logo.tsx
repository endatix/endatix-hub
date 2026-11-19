"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useBrand } from "./brand-provider";
import { BUILT_IN_ASSETS, BUILT_IN_NAME } from "./built-in-assets";
import type { Brand } from "./index";

export interface BrandLogoProps {
  /**
   * `logo`: the wordmark (sign-in, signup). `icon`: the square icon.
   * `lockup`: the expanded sidebar, icon and name side by side.
   */
  readonly variant?: "logo" | "icon" | "lockup";
  readonly className?: string;
  readonly priority?: boolean;
}

interface ThemedPair {
  readonly light: string;
  readonly dark: string;
}

/** Wordmark proportions; CSS sets the rendered size. */
const LOGO_SIZE = { width: 3778, height: 706 };
const ICON_SIZE = { width: 706, height: 706 };
const BUILT_IN_WORDMARK = {
  pair: BUILT_IN_ASSETS.wordmark,
  width: 217,
  height: 46,
  className: "h-6 w-auto",
};

interface ImageShape {
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly className?: string;
  readonly priority?: boolean;
}

type PartProps = Readonly<{
  brand: Brand;
  className?: string;
  priority?: boolean;
}>;

/**
 * The brand's logo or icon for the current theme. The built-in brand keeps its
 * light and dark artwork; a pack's icon is one file for both themes.
 */
export function BrandLogo({
  variant = "logo",
  ...props
}: Readonly<BrandLogoProps>) {
  const Part = PARTS[variant];
  return <Part brand={useBrand()} {...props} />;
}

/** Named after whoever supplied the image: a pack without a logo still shows Endatix. */
function BrandWordmark({ brand, ...props }: PartProps) {
  const alt = isBuiltIn(brand.logo.light) ? BUILT_IN_NAME : brand.name;
  return <ThemedImage pair={brand.logo} alt={alt} {...LOGO_SIZE} {...props} />;
}

function BrandIcon({ brand, ...props }: PartProps) {
  const shape = { ...ICON_SIZE, ...props };
  if (isBuiltIn(brand.icon))
    return <ThemedImage pair={BUILT_IN_ASSETS.mark} alt="" {...shape} />;
  return <Image src={brand.icon} alt="" aria-hidden {...shape} unoptimized />;
}

/** The built-in sidebar shows its icon and wordmark files apart, for gap control. */
function BrandLockup({ brand, priority }: PartProps) {
  if (!isBuiltIn(brand.icon) || !isBuiltIn(brand.logo.light))
    return (
      <BrandWordmark brand={brand} className="h-7 w-auto" priority={priority} />
    );
  return (
    <>
      <BrandIcon
        brand={brand}
        className="h-7 w-auto shrink-0"
        priority={priority}
      />
      <ThemedImage
        {...BUILT_IN_WORDMARK}
        alt={BUILT_IN_NAME}
        priority={priority}
      />
    </>
  );
}

const BUILT_IN_URLS: ReadonlySet<string> = new Set([
  BUILT_IN_ASSETS.icon,
  BUILT_IN_ASSETS.logo.light,
  BUILT_IN_ASSETS.logo.dark,
]);

/** A brand URL that is still the built-in file: the pack left that asset out. Pack URLs are under `/brand/`, so they never match. */
function isBuiltIn(url: string): boolean {
  return BUILT_IN_URLS.has(url);
}

const PARTS = { logo: BrandWordmark, icon: BrandIcon, lockup: BrandLockup };

/** The light image hides in dark mode; the dark one shows only there. */
const THEMES = [
  { key: "light", before: "", after: "dark:hidden" },
  { key: "dark", before: "hidden", after: "dark:block" },
] as const;

function ThemedImage({
  pair,
  alt,
  className,
  ...shape
}: Readonly<ImageShape & { pair: ThemedPair }>) {
  return THEMES.map(({ key, before, after }) => (
    <Image
      key={key}
      src={pair[key]}
      alt={alt}
      aria-hidden={alt === "" || undefined}
      {...shape}
      unoptimized
      className={cn(before, className, after)}
    />
  ));
}
