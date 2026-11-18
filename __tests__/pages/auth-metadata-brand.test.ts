import type { Metadata } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Brand } from "@/lib/branding";
import { BUILT_IN_LAYER, mergeBrand } from "@/lib/branding/layers";
import { packBrand } from "@/test/pack-brand";

const builtIn = mergeBrand([BUILT_IN_LAYER]);
const current: { brand: Brand } = { brand: builtIn };

vi.mock("next/server", () => ({}));
vi.mock("next/font/google", () => ({
  Instrument_Sans: () => ({ variable: "font-instrument-sans" }),
}));
vi.mock("@/lib/fonts/geist-local", () => ({
  geistSans: { variable: "font-geist-sans" },
  geistMono: { variable: "font-geist-mono" },
}));
vi.mock("@/auth", () => ({ auth: vi.fn(), authPresentation: [] }));
vi.mock("@/lib/branding/server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/branding/server")>();
  const { metadataFor } = await import("@/lib/branding/brand-metadata");
  return {
    ...original,
    getBrand: async () => current.brand,
    brandMetadata: async (page?: Parameters<typeof metadataFor>[1]) =>
      metadataFor(current.brand, page, {
        builtIn: current.brand === builtIn,
      }),
  };
});

type MetadataPage = { generateMetadata: () => Promise<Metadata> };

const pages: [string, () => Promise<MetadataPage>, string][] = [
  [
    "sign-in",
    () => import("@/app/(auth)/signin/page"),
    "Sign in the Endatix Hub form management portal.",
  ],
  [
    "sign-out",
    () => import("@/app/(auth)/signout/page"),
    "Sign out from the Endatix Hub form management portal.",
  ],
  [
    "create account",
    () => import("@/app/(auth)/create-account/page"),
    "Create a new account in the Endatix Hub form management portal.",
  ],
  [
    "auth error",
    () => import("@/app/(auth)/auth-error/page"),
    "Authentication failed the Endatix Hub form management portal.",
  ],
  [
    "accept invitation",
    () => import("@/app/(auth)/activate-invite/page"),
    "Accept your Endatix Hub invitation and set your password.",
  ],
  [
    "auth layout",
    () => import("@/app/(auth)/layout"),
    "Login to your Endatix Hub account",
  ],
];

describe("auth page metadata", () => {
  beforeEach(() => {
    current.brand = builtIn;
  });

  it.each(pages)(
    "%s keeps its description with no brand pack",
    async (_, load, expected) => {
      const metadata = await (await load()).generateMetadata();

      expect(metadata.description).toBe(expected);
    },
  );

  it.each(pages)(
    "%s names the pack, not Endatix",
    async (_, load, expected) => {
      current.brand = packBrand();

      const metadata = await (await load()).generateMetadata();

      expect(metadata.description).toBe(
        expected.replace("Endatix Hub", "Example Forms"),
      );
      const { title, description, applicationName, publisher, authors } =
        metadata;
      expect(
        JSON.stringify({
          title,
          description,
          applicationName,
          publisher,
          authors,
        }),
      ).not.toMatch(/endatix/i);
    },
  );
});
