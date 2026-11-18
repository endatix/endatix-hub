import type { Metadata } from "next";
import { describe, expect, it, vi } from "vitest";

const flagState = vi.hoisted(() => ({ on: false }));

vi.mock("@/lib/feature-flags/flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/feature-flags/flags")>()),
  whiteLabelingFlag: async () => flagState.on,
}));
vi.mock("@/auth", () => ({ auth: vi.fn(), authPresentation: vi.fn() }));
vi.mock("@/lib/fonts/geist-local", () => ({
  geistSans: { variable: "" },
  geistMono: { variable: "" },
}));
vi.mock("next/font/google", () => ({
  Instrument_Sans: () => ({ variable: "" }),
}));

type Route = {
  name: string;
  load: () => Promise<{ generateMetadata: () => Promise<Metadata> }>;
  title: string;
};

/** Today's titles with no brand pack: the built-in brand must keep them. */
const ROUTES: Route[] = [
  {
    name: "(main) layout",
    load: () => import("@/app/(main)/layout"),
    title: "Endatix Hub",
  },
  {
    name: "(auth) layout",
    load: () => import("@/app/(auth)/layout"),
    title: "Endatix Hub",
  },
  {
    name: "sign in",
    load: () => import("@/app/(auth)/signin/page"),
    title: "Sign in | Endatix Hub",
  },
  {
    name: "sign out",
    load: () => import("@/app/(auth)/signout/page"),
    title: "Sign out | Endatix Hub",
  },
  {
    name: "signup",
    load: () => import("@/app/(auth)/signup/page"),
    title: "Sign up | Endatix Hub",
  },
  {
    name: "create account",
    load: () => import("@/app/(auth)/create-account/page"),
    title: "Create account | Endatix Hub",
  },
  {
    name: "auth error",
    load: () => import("@/app/(auth)/auth-error/page"),
    title: "Authentication failed | Endatix Hub",
  },
  {
    name: "accept invitation",
    load: () => import("@/app/(auth)/activate-invite/page"),
    title: "Accept Invitation | Endatix Hub",
  },
  {
    name: "tenant sign in",
    load: () => import("@/app/(auth)/t/[tenantSlug]/signin/page"),
    title: "Sign in | Endatix Hub",
  },
  {
    name: "tenant register",
    load: () => import("@/app/(auth)/t/[tenantSlug]/register/page"),
    title: "Create account | Endatix Hub",
  },
  {
    name: "unauthorized layout",
    load: () => import("@/app/unauthorized/layout"),
    title: "Endatix Hub - Error",
  },
  {
    name: "unauthorized page",
    load: () => import("@/app/unauthorized/page"),
    title: "403 - Access Denied",
  },
  {
    name: "maintenance",
    load: () => import("@/app/(public)/maintenance/layout"),
    title: "Scheduled maintenance",
  },
  {
    name: "export error",
    load: () => import("@/app/(public)/export-error/layout"),
    title: "Export failed",
  },
  {
    name: "global not found",
    load: () => import("@/app/global-not-found"),
    title: "404 - Page Not Found",
  },
  {
    name: "edit",
    load: () => import("@/app/(public)/edit/layout"),
    title: "Edit Submission | Endatix Hub",
  },
  {
    name: "view",
    load: () => import("@/app/(public)/view/layout"),
    title: "View Submission | Endatix Hub",
  },
  {
    name: "share",
    load: () => import("@/app/(public)/share/layout"),
    title: "Form | Endatix Hub",
  },
  {
    name: "embed",
    load: () => import("@/app/(public)/embed/[formId]/layout"),
    title: "Form | Endatix Hub",
  },
];

/** The pages that had a social preview before. */
const SOCIAL = new Set([
  "sign in",
  "sign out",
  "signup",
  "create account",
  "auth error",
  "unauthorized page",
]);

describe("route metadata with the built-in brand", () => {
  it.each(ROUTES)("$name keeps its title", async ({ load, title }) => {
    // Act
    const metadata = await (await load()).generateMetadata();

    // Assert
    expect(metadata.title).toBe(title);
  });

  it.each(ROUTES)(
    "$name has a social image only where it had one",
    async ({ name, load }) => {
      // Act
      const metadata = await (await load()).generateMetadata();

      // Assert
      const images = (metadata.openGraph as { images?: unknown } | undefined)
        ?.images;
      expect(images).toEqual(
        SOCIAL.has(name)
          ? [{ url: "/assets/endatix-og-image.jpg" }]
          : undefined,
      );
    },
  );

  it.each(ROUTES.filter((route) => !["share", "embed"].includes(route.name)))(
    "$name names the built-in icon",
    async ({ load }) => {
      // Act
      const metadata = await (await load()).generateMetadata();

      // Assert
      expect(metadata.icons).toEqual({
        icon: [{ url: "/assets/icons/icon.svg", type: "image/svg+xml" }],
      });
    },
  );
});
