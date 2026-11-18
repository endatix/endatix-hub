import { describe, expect, it } from "vitest";
import { helpMenuItems, sitemap, withBrandHelpLinks } from "@/lib/constants";
import { brandAuthors, brandKeywords } from "../brand-metadata";
import {
  brandUrl,
  isPoweredByShown,
  withIndefiniteArticle,
  withPoweredBy,
} from "../copy";
import { BUILT_IN_LAYER, mergeBrand, packLayer } from "../layers";
import { BrandPackSchema } from "../schema";

const builtIn = mergeBrand([BUILT_IN_LAYER]);
const pack = (fields: Record<string, unknown> = {}) =>
  mergeBrand([
    packLayer(
      BrandPackSchema.parse({ version: 1, name: "Example Forms", ...fields }),
      (file) => file,
    ),
    BUILT_IN_LAYER,
  ]);

/** With no pack, every string the Hub builds from the brand is the literal it replaced. */
describe("built-in brand copy is unchanged", () => {
  it.each([
    [
      "page description",
      `Sign in the ${builtIn.name} form management portal.`,
      "Sign in the Endatix Hub form management portal.",
    ],
    [
      "sign-out title",
      `Sign out of ${builtIn.name}?`,
      "Sign out of Endatix Hub?",
    ],
    [
      "signup description",
      `Request access to ${withIndefiniteArticle(builtIn.shortName)} workspace.`,
      "Request access to an Endatix workspace.",
    ],
    ["about title", `About ${builtIn.shortName}`, "About Endatix"],
    ["API label", `${builtIn.shortName} API URL`, "Endatix API URL"],
    [
      "PDF error",
      `Failed to load submission from the ${builtIn.shortName} API.`,
      "Failed to load submission from the Endatix API.",
    ],
    ["assistant", builtIn.personas.assistant, "Endatix AI Assistant"],
    ["bot", builtIn.personas.bot, "Endatix Bot"],
    ["generator", builtIn.shortName, "Endatix"],
    ["hero", builtIn.tagline, "Form Management Platform"],
    ["website host", new URL(builtIn.links.website!).host, "endatix.com"],
  ])("%s", (_, actual, expected) => {
    expect(actual).toBe(expected);
  });

  it("keeps authors and keywords", () => {
    expect(brandAuthors(builtIn)).toEqual([
      { name: "Endatix Team", url: "https://endatix.com" },
    ]);
    expect(brandKeywords(builtIn)).toEqual([
      "endatix",
      "endatix hub",
      "endatix hub app",
    ]);
  });

  it("keeps the built-in deep links and the whole help menu", () => {
    const deep =
      "https://docs.endatix.com/docs/form-builder?utm_source=endatix-hub";
    expect(brandUrl(builtIn, "docs", deep)).toBe(deep);
    expect(helpMenuItems(builtIn)).toEqual({
      documentation: sitemap.documentation,
      support: sitemap.support,
    });
    const items = [sitemap.forms, sitemap.documentation, sitemap.support];
    expect(withBrandHelpLinks(items, builtIn)).toEqual(items);
  });

  it("leaves Powered by to ENDATIX_SHOW_POWERED_BY", () => {
    expect(isPoweredByShown(builtIn, true)).toBe(true);
    expect(isPoweredByShown(builtIn, false)).toBe(false);
  });
});

describe("a brand pack's copy", () => {
  it("uses the pack's name and links, never Endatix's", () => {
    const brand = pack({ links: { docs: "https://docs.example.com" } });

    expect(brandAuthors(brand)).toEqual([{ name: "Example Forms Team" }]);
    expect(brandKeywords(brand)).toEqual([
      "example forms",
      "example forms app",
    ]);
    expect(withIndefiniteArticle(brand.shortName)).toBe("an Example Forms");
    expect(brandUrl(brand, "docs", "https://docs.endatix.com/x")).toBe(
      "https://docs.example.com",
    );
    expect(brandUrl(brand, "website", "https://endatix.com/x")).toBeUndefined();
  });

  it("points Documentation at the pack's docs with no Endatix children, and drops Support it lacks", () => {
    const brand = pack({ links: { docs: "https://docs.example.com" } });

    const help = helpMenuItems(brand);

    expect(help.documentation?.url).toBe("https://docs.example.com");
    expect(help.documentation?.children).toBeUndefined();
    expect(help.support).toBeUndefined();
    expect(withBrandHelpLinks([sitemap.forms, sitemap.support], brand)).toEqual(
      [sitemap.forms],
    );
  });

  it("lets poweredBy win over ENDATIX_SHOW_POWERED_BY", () => {
    expect(isPoweredByShown(pack({ poweredBy: false }), true)).toBe(false);
    expect(isPoweredByShown(pack({ poweredBy: true }), false)).toBe(true);
    expect(isPoweredByShown(pack(), false)).toBe(false);
  });

  it("gives respondent pages the deployment's poweredBy over the built-in look", () => {
    const respondent = withPoweredBy(builtIn, pack({ poweredBy: false }));

    expect(respondent.name).toBe("Endatix Hub");
    expect(isPoweredByShown(respondent, true)).toBe(false);
  });
});
