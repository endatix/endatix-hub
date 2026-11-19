import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mountPackDir } from "@/lib/branding/__tests__/pack-dir";

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
/** A segment module; a page with no metadata exports neither field. */
type Loader = () => Promise<unknown>;

type Route = {
  name: string;
  /** The segments that carry metadata, outermost first: root layout, nested layouts, page. */
  chain: Loader[];
  /** Today's title with no brand pack: the built-in brand must keep it. */
  title: string;
  /** The title with the example pack applied. */
  packTitle: string;
  /** Whether the route's layout hands down the social image. */
  social: boolean;
};

const auth = () => import("@/app/(auth)/layout");
const unauthorized = () => import("@/app/unauthorized/layout");

const ROUTES: Route[] = [
  {
    name: "(main) layout",
    chain: [() => import("@/app/(main)/layout")],
    title: "Endatix Hub",
    packTitle: "Example Forms",
    social: false,
  },
  {
    name: "(auth) layout",
    chain: [auth],
    title: "Endatix Hub",
    packTitle: "Example Forms",
    social: true,
  },
  ...[
    ["sign in", () => import("@/app/(auth)/signin/page"), "Sign in"],
    ["sign out", () => import("@/app/(auth)/signout/page"), "Sign out"],
    ["signup", () => import("@/app/(auth)/signup/page"), "Sign up"],
    [
      "create account",
      () => import("@/app/(auth)/create-account/page"),
      "Create account",
    ],
    [
      "auth error",
      () => import("@/app/(auth)/auth-error/page"),
      "Authentication failed",
    ],
    [
      "accept invitation",
      () => import("@/app/(auth)/activate-invite/page"),
      "Accept Invitation",
    ],
    [
      "tenant sign in",
      () => import("@/app/(auth)/t/[tenantSlug]/signin/page"),
      "Sign in",
    ],
    [
      "tenant register",
      () => import("@/app/(auth)/t/[tenantSlug]/register/page"),
      "Create account",
    ],
  ].map(
    ([name, page, title]): Route => ({
      name: name as string,
      chain: [auth, page as Loader],
      title: `${title as string} | Endatix Hub`,
      packTitle: `${title as string} | Example Forms`,
      social: true,
    }),
  ),
  {
    name: "reset password",
    chain: [auth, () => import("@/app/(auth)/reset-password/page")],
    title: "Reset Password",
    packTitle: "Reset Password",
    social: true,
  },
  {
    name: "forgot password",
    chain: [auth, () => import("@/app/(auth)/forgot-password/page")],
    title: "Endatix Hub",
    packTitle: "Example Forms",
    social: true,
  },
  {
    name: "session bridge",
    chain: [auth, () => import("@/app/(auth)/session-bridge/page")],
    title: "Endatix Hub",
    packTitle: "Example Forms",
    social: true,
  },
  {
    name: "account verification",
    chain: [
      auth,
      () => import("@/app/(auth)/account-verification/layout"),
      () => import("@/app/(auth)/account-verification/page"),
    ],
    title: "Endatix Hub",
    packTitle: "Example Forms",
    social: true,
  },
  {
    name: "verify email",
    chain: [
      auth,
      () => import("@/app/(auth)/verify-email/layout"),
      () => import("@/app/(auth)/verify-email/page"),
    ],
    title: "Endatix Hub",
    packTitle: "Example Forms",
    social: true,
  },
  {
    name: "unauthorized layout",
    chain: [unauthorized],
    title: "Endatix Hub - Error",
    packTitle: "Example Forms - Error",
    social: true,
  },
  {
    name: "unauthorized page",
    chain: [unauthorized, () => import("@/app/unauthorized/page")],
    title: "403 - Access Denied",
    packTitle: "403 - Access Denied",
    social: true,
  },
  {
    name: "maintenance",
    chain: [() => import("@/app/(public)/maintenance/layout")],
    title: "Scheduled maintenance",
    packTitle: "Scheduled maintenance",
    social: false,
  },
  {
    name: "export error",
    chain: [() => import("@/app/(public)/export-error/layout")],
    title: "Export failed",
    packTitle: "Export failed",
    social: false,
  },
  {
    name: "global not found",
    chain: [() => import("@/app/global-not-found")],
    title: "404 - Page Not Found",
    packTitle: "404 - Page Not Found",
    social: false,
  },
  {
    name: "edit",
    chain: [() => import("@/app/(public)/edit/layout")],
    title: "Edit Submission - Endatix",
    packTitle: "Edit Submission | Example Forms",
    social: false,
  },
  {
    name: "view",
    chain: [() => import("@/app/(public)/view/layout")],
    title: "View Submission - Endatix",
    packTitle: "View Submission | Example Forms",
    social: false,
  },
  {
    name: "share",
    chain: [() => import("@/app/(public)/share/layout")],
    title: "Endatix Form",
    packTitle: "Form | Example Forms",
    social: false,
  },
  {
    name: "embed",
    chain: [() => import("@/app/(public)/embed/[formId]/layout")],
    title: "Endatix Form",
    packTitle: "Form | Example Forms",
    social: false,
  },
];

/** Respondent pages keep the built-in icon (`getRespondentBrand`). */
const RESPONDENT = new Set(["share", "embed"]);

async function metadataOf(load: Loader): Promise<Metadata> {
  const loaded = (await load()) as MetadataModule;
  return loaded.generateMetadata
    ? loaded.generateMetadata()
    : (loaded.metadata ?? {});
}

/**
 * The route's metadata, segment over segment, by the Next.js rules these routes
 * rely on: a string title (or a `{ default }`) fills the nearest parent
 * `title.template`; `{ absolute }` stands alone; a segment without a title,
 * `openGraph` or `icons` keeps its parent's. It does not model og:title and
 * og:description, which Next fills from the page after merging: the running-app
 * head diff in the PR covers those.
 */
async function resolve(route: Route) {
  let merged: Metadata = {};
  let template: string | null = null;
  for (const [index, load] of route.chain.entries()) {
    const own = await metadataOf(load);
    const isRoot = index === 0;
    merged = {
      ...merged,
      ...own,
      title:
        own.title == null
          ? merged.title
          : applyTemplate(own.title, isRoot ? null : template),
      openGraph: own.openGraph ?? merged.openGraph,
      icons: own.icons ?? merged.icons,
    };
    template = templateOf(own.title) ?? template;
  }
  return { ...merged, title: titleText(merged.title) };
}

function applyTemplate(
  title: NonNullable<Metadata["title"]>,
  template: string | null,
): Metadata["title"] {
  if (typeof title === "object" && "absolute" in title) return title;
  const text = typeof title === "string" ? title : title.default;
  if (!template) return title;
  const filled = template.replace(/%s/g, text);
  return typeof title === "string" ? filled : { ...title, default: filled };
}

function templateOf(title: Metadata["title"]): string | null {
  return title && typeof title === "object" && "template" in title
    ? (title.template ?? null)
    : null;
}

function titleText(title: Metadata["title"]): string | undefined {
  if (title == null || typeof title === "string") return title ?? undefined;
  return "absolute" in title ? title.absolute : title.default;
}

function images(metadata: Metadata) {
  return (metadata.openGraph as { images?: unknown } | undefined)?.images;
}

const pack = mountPackDir();

async function useBrand(mode: "built-in" | "pack") {
  flagState.on = mode === "pack";
  if (mode === "pack") {
    pack.write({ assets: { icon: "icon.svg", ogImage: "og.jpg" } });
    writeFileSync(path.join(pack.path, "icon.svg"), "<svg/>");
    writeFileSync(path.join(pack.path, "og.jpg"), "jpg");
  }
  vi.resetModules();
}

describe("route metadata with the built-in brand", () => {
  beforeEach(() => useBrand("built-in"));

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
      expect(images(metadata)).toEqual(
        route.social ? [{ url: "/assets/endatix-og-image.jpg" }] : undefined,
      );
    },
  );

  it.each(ROUTES.filter((route) => !RESPONDENT.has(route.name)))(
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

describe("route metadata with a brand pack", () => {
  beforeEach(() => useBrand("pack"));

  it.each(ROUTES)("$name names the pack in its title", async (route) => {
    // Act
    const metadata = await resolve(route);

    // Assert
    expect(metadata.title).toBe(route.packTitle);
  });

  it.each(ROUTES.filter((route) => route.social))(
    "$name gets the pack's social image",
    async (route) => {
      // Act
      const metadata = await resolve(route);

      // Assert
      expect(images(metadata)).toEqual([
        { url: expect.stringMatching(/^\/brand\/og\.jpg\?v=[0-9a-f]{12}$/) },
      ]);
    },
  );

  it.each(ROUTES.filter((route) => !RESPONDENT.has(route.name)))(
    "$name names the pack's icon",
    async (route) => {
      // Act
      const metadata = await resolve(route);

      // Assert
      expect(metadata.icons).toEqual({
        icon: [
          {
            url: expect.stringMatching(/^\/brand\/icon\.svg\?v=/),
            type: "image/svg+xml",
          },
        ],
      });
    },
  );
});

describe("pages under a layout that hands down the social image", () => {
  /** A page's own `openGraph` replaces the layout's, image included. */
  it.each(["app/(auth)", "app/unauthorized"])(
    "%s: no page or nested layout sets its own openGraph",
    (folder) => {
      // Arrange
      const files = readdirSync(folder, { recursive: true, encoding: "utf8" })
        .filter((file) => /(^|\/)(page|layout)\.tsx$/.test(file))
        .filter(
          (file) => !/(^|\/)layout\.tsx$/.test(file) || file.includes("/"),
        );

      // Act
      const offenders = files.filter((file) =>
        /\bopenGraph\s*:/.test(readFileSync(path.join(folder, file), "utf8")),
      );

      // Assert
      expect(files.length).toBeGreaterThan(0);
      expect(offenders).toEqual([]);
    },
  );

  it("every (auth) page is in the route table", () => {
    // Arrange
    const pages = readdirSync("app/(auth)", {
      recursive: true,
      encoding: "utf8",
    }).filter((file) => file.endsWith("page.tsx"));

    // Assert
    expect(pages.length).toBe(
      ROUTES.filter(
        (route) => route.chain[0] === auth && route.chain.length > 1,
      ).length,
    );
  });
});
