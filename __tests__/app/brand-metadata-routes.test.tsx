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

type MetadataModule = {
  metadata?: Metadata;
  generateMetadata?: () => Promise<Metadata>;
};

type Route = {
  name: string;
  /** The root layout the route renders in. */
  layout: () => Promise<MetadataModule>;
  /** The page, when the route is a page below that layout. */
  page?: () => Promise<MetadataModule>;
  title: string;
};

async function metadataOf(load: () => Promise<MetadataModule>) {
  const loaded = await load();
  return loaded.generateMetadata
    ? loaded.generateMetadata()
    : (loaded.metadata ?? {});
}

/**
 * The page's metadata over its layout's, by the two Next.js rules these
 * routes rely on: a string page title fills the layout's `title.template`,
 * and a page without `openGraph` or `icons` keeps the layout's.
 */
async function resolve({ layout, page }: Route) {
  const parent = await metadataOf(layout);
  if (!page) return { ...parent, title: titleText(parent.title) };
  const own = await metadataOf(page);
  const template =
    parent.title &&
    typeof parent.title === "object" &&
    "template" in parent.title
      ? parent.title.template
      : null;
  const title =
    typeof own.title === "string" && template
      ? template.replace("%s", own.title)
      : titleText(own.title ?? parent.title);
  return {
    ...parent,
    ...own,
    title,
    openGraph: own.openGraph ?? parent.openGraph,
    icons: own.icons ?? parent.icons,
  };
}

function titleText(title: Metadata["title"]): string | undefined {
  if (title == null || typeof title === "string") return title ?? undefined;
  return "absolute" in title ? title.absolute : title.default;
}

/** Today's titles with no brand pack: the built-in brand must keep them. */
const ROUTES: Route[] = [
  {
    name: "(main) layout",
    layout: () => import("@/app/(main)/layout"),
    title: "Endatix Hub",
  },
  {
    name: "(auth) layout",
    layout: () => import("@/app/(auth)/layout"),
    title: "Endatix Hub",
  },
  {
    name: "sign in",
    layout: () => import("@/app/(auth)/layout"),
    page: () => import("@/app/(auth)/signin/page"),
    title: "Sign in | Endatix Hub",
  },
  {
    name: "sign out",
    layout: () => import("@/app/(auth)/layout"),
    page: () => import("@/app/(auth)/signout/page"),
    title: "Sign out | Endatix Hub",
  },
  {
    name: "signup",
    layout: () => import("@/app/(auth)/layout"),
    page: () => import("@/app/(auth)/signup/page"),
    title: "Sign up | Endatix Hub",
  },
  {
    name: "create account",
    layout: () => import("@/app/(auth)/layout"),
    page: () => import("@/app/(auth)/create-account/page"),
    title: "Create account | Endatix Hub",
  },
  {
    name: "auth error",
    layout: () => import("@/app/(auth)/layout"),
    page: () => import("@/app/(auth)/auth-error/page"),
    title: "Authentication failed | Endatix Hub",
  },
  {
    name: "accept invitation",
    layout: () => import("@/app/(auth)/layout"),
    page: () => import("@/app/(auth)/activate-invite/page"),
    title: "Accept Invitation | Endatix Hub",
  },
  {
    name: "tenant sign in",
    layout: () => import("@/app/(auth)/layout"),
    page: () => import("@/app/(auth)/t/[tenantSlug]/signin/page"),
    title: "Sign in | Endatix Hub",
  },
  {
    name: "tenant register",
    layout: () => import("@/app/(auth)/layout"),
    page: () => import("@/app/(auth)/t/[tenantSlug]/register/page"),
    title: "Create account | Endatix Hub",
  },
  {
    name: "reset password",
    layout: () => import("@/app/(auth)/layout"),
    page: () => import("@/app/(auth)/reset-password/page"),
    title: "Reset Password",
  },
  {
    name: "unauthorized layout",
    layout: () => import("@/app/unauthorized/layout"),
    title: "Endatix Hub - Error",
  },
  {
    name: "unauthorized page",
    layout: () => import("@/app/unauthorized/layout"),
    page: () => import("@/app/unauthorized/page"),
    title: "403 - Access Denied",
  },
  {
    name: "maintenance",
    layout: () => import("@/app/(public)/maintenance/layout"),
    title: "Scheduled maintenance",
  },
  {
    name: "export error",
    layout: () => import("@/app/(public)/export-error/layout"),
    title: "Export failed",
  },
  {
    name: "global not found",
    layout: () => import("@/app/global-not-found"),
    title: "404 - Page Not Found",
  },
  {
    name: "edit",
    layout: () => import("@/app/(public)/edit/layout"),
    title: "Edit Submission - Endatix",
  },
  {
    name: "view",
    layout: () => import("@/app/(public)/view/layout"),
    title: "View Submission - Endatix",
  },
  {
    name: "share",
    layout: () => import("@/app/(public)/share/layout"),
    title: "Endatix Form",
  },
  {
    name: "embed",
    layout: () => import("@/app/(public)/embed/[formId]/layout"),
    title: "Endatix Form",
  },
];

/**
 * The (auth) and unauthorized layouts hand the social image down to every page
 * below them; the six pages that had one before keep it, the rest gain it.
 */
const SOCIAL = new Set([
  "(auth) layout",
  "sign in",
  "sign out",
  "signup",
  "create account",
  "auth error",
  "accept invitation",
  "tenant sign in",
  "tenant register",
  "reset password",
  "unauthorized layout",
  "unauthorized page",
]);

describe("route metadata with the built-in brand", () => {
  it.each(ROUTES)("$name keeps its title", async (route) => {
    // Act
    const metadata = await resolve(route);

    // Assert
    expect(metadata.title).toBe(route.title);
  });

  it.each(ROUTES)(
    "$name has the social image where its layout hands one down",
    async (route) => {
      // Act
      const metadata = await resolve(route);

      // Assert
      const images = (metadata.openGraph as { images?: unknown } | undefined)
        ?.images;
      expect(images).toEqual(
        SOCIAL.has(route.name)
          ? [{ url: "/assets/endatix-og-image.jpg" }]
          : undefined,
      );
    },
  );

  it.each(ROUTES.filter((route) => !["share", "embed"].includes(route.name)))(
    "$name names the built-in icon",
    async (route) => {
      // Act
      const metadata = await resolve(route);

      // Assert
      expect(metadata.icons).toEqual({
        icon: [{ url: "/assets/icons/icon.svg", type: "image/svg+xml" }],
      });
    },
  );
});
